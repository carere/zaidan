import { defineChannel, GET, POST } from "eve/channels";
import { start, getRun, resumeHook } from "workflow/api";
import { compatibilityWorkflow } from "../lib/workflow";

export default defineChannel({
  routes: [
    POST("/compatibility/start", async () => {
      const root = process.env.COMPAT_FIXTURE;
      const questionId = process.env.COMPAT_QUESTION_ID;
      if (!root || !questionId)
        return Response.json({ error: "Fixture environment required" }, { status: 400 });
      const run = await start(compatibilityWorkflow, [root, questionId]);
      return Response.json({ runId: run.runId, questionId });
    }),
    GET("/compatibility/runs/:id", async (_request, { params }) => {
      const run = getRun(params.id);
      const status = await run.status;
      return Response.json({
        status,
        ...(status === "completed" ? { result: await run.returnValue } : {}),
      });
    }),
    POST("/compatibility/answer", async (request) => {
      const data = await request.json();
      if (data.questionId !== process.env.COMPAT_QUESTION_ID || data.answer !== "blue")
        return Response.json({ error: "Unmatched answer" }, { status: 400 });
      await resumeHook(data.questionId, data);
      return Response.json({ accepted: true });
    }),
  ],
});
