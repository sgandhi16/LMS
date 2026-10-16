import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const csvContent = [
    "type,prompt,marks,explanation,option_a,option_b,option_c,option_d,correct_options,accepted_answers,fuzzy_match,levenshtein_threshold",
    'MCQ_SINGLE,"What is the main stance in boxing for a right-handed fighter?",2,"Orthodox is standard for right handers.","Orthodox","Southpaw","Square","Switch",a,,,',
    'MCQ_MULTI,"Which punches are considered power punches? (Select all)",3,"Cross, hook, and uppercut generate rotational power.","Jab","Cross","Left Hook","Uppercut","b,c,d",,,',
    'SHORT_ANSWER,"In one word, what surface is Wimbledon played on?",1,"Wimbledon is played on grass courts.",,,,,grass|lawn,true,1',
  ].join("\n");

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="question_import_template.csv"',
    },
  });
}
