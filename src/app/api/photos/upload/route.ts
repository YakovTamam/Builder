import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { connectToDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAccessibleProject } from "@/lib/access";

// Generates short-lived client-upload tokens for Vercel Blob so the browser can
// upload photos directly to storage (bypassing the serverless body-size limit).
// The actual Photo document is created by POST /api/photos with the returned URL.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "העלאת קבצים אינה מוגדרת בשרת (חסר BLOB_READ_WRITE_TOKEN)" },
      { status: 501 },
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        // The client sends the target projectId; only issue a token if this
        // user is actually allowed to touch that project.
        let projectId: string | undefined;
        try {
          projectId = clientPayload ? (JSON.parse(clientPayload).projectId as string) : undefined;
        } catch {
          projectId = undefined;
        }
        if (!projectId) throw new Error("חסר מזהה פרויקט");

        await connectToDatabase();
        const project = await getAccessibleProject(projectId, session);
        if (!project) throw new Error("אין הרשאה לפרויקט זה");

        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
          maximumSizeInBytes: 15 * 1024 * 1024, // 15MB
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: session.sub, projectId }),
        };
      },
      // The document is created client-side after upload resolves, so no work
      // is needed here. (This webhook only fires with a public callback URL.)
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message ?? "שגיאה בהעלאת הקובץ" },
      { status: 400 },
    );
  }
}
