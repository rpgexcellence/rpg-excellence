import { createClient } from "../../../../../lib/supabase/server";
import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "pdf-lib";

import {
  calculateClauseScore,
  calculateSimpleOverallScore,
  calculateWeightedOverallScore,
  calculateProgress,
} from "../scoring";

const CLAUSE_NUMBERS = [
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
];

const CLAUSE_TITLES = {
  "4": "Context of the Organization",
  "5": "Leadership",
  "6": "Planning",
  "7": "Support",
  "8": "Operation",
  "9": "Performance Evaluation",
  "10": "Improvement",
};

function getMaturityLevel(score) {
  if (score === null) return "Not assessed";
  if (score <= 20) return "Initial";
  if (score <= 40) return "Developing";
  if (score <= 60) return "Managed";
  if (score <= 80) return "Controlled";
  return "Optimized";
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wrapText(text, maxLength = 82) {
  const words = cleanText(text).split(" ");
  const lines = [];
  let line = "";

  for (const word of words) {
    const candidate = line
      ? `${line} ${word}`
      : word;

    if (candidate.length > maxLength) {
      if (line) {
        lines.push(line);
      }

      line = word;
    } else {
      line = candidate;
    }
  }

  if (line) {
    lines.push(line);
  }

  return lines;
}

export async function GET(request, { params }) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(
      "Unauthorized",
      {
        status: 401,
      }
    );
  }

  const {
    data: assessment,
    error: assessmentError,
  } = await supabase
    .from("assessments")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (
    assessmentError ||
    !assessment
  ) {
    return new Response(
      "Assessment not found",
      {
        status: 404,
      }
    );
  }

  const {
    data: questions,
    error: questionsError,
  } = await supabase
    .from("assessment_questions")
    .select("*")
    .eq(
      "standard",
      assessment.standard
    )
    .eq("active", true)
    .order("display_order", {
      ascending: true,
    });

  if (questionsError) {
    return new Response(
      "Unable to load assessment questions",
      {
        status: 500,
      }
    );
  }

  const allQuestions =
    questions ?? [];

  const questionNumbers =
    allQuestions.map(
      (question) =>
        question.question_number
    );

  let answers = [];

  if (
    questionNumbers.length > 0
  ) {
    const {
      data,
      error: answersError,
    } = await supabase
      .from("assessment_answers")
      .select("*")
      .eq(
        "assessment_id",
        assessment.id
      )
      .eq(
        "owner_id",
        user.id
      )
      .in(
        "clause",
        questionNumbers
      );

    if (answersError) {
      return new Response(
        "Unable to load assessment answers",
        {
          status: 500,
        }
      );
    }

    answers = data ?? [];
  }

  const {
    data: scoringProfile,
    error: scoringProfileError,
  } = await supabase
    .from("scoring_profiles")
    .select(
      "id, profile_name, version_label"
    )
    .eq(
      "standard",
      assessment.standard
    )
    .eq("active", true)
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (
    scoringProfileError
  ) {
    return new Response(
      "Unable to load scoring profile",
      {
        status: 500,
      }
    );
  }

  let weights = {};

  if (scoringProfile) {
    const {
      data: clauseWeights,
      error: clauseWeightsError,
    } = await supabase
      .from(
        "scoring_profile_clauses"
      )
      .select(
        "clause, weight"
      )
      .eq(
        "scoring_profile_id",
        scoringProfile.id
      );

    if (
      clauseWeightsError
    ) {
      return new Response(
        "Unable to load clause weights",
        {
          status: 500,
        }
      );
    }

    weights =
      Object.fromEntries(
        (
          clauseWeights ?? []
        ).map((row) => [
          row.clause,
          Number(row.weight),
        ])
      );
  }

  const progress =
    calculateProgress(
      allQuestions,
      answers
    );

  const hasWeightedProfile =
    Object.keys(weights)
      .length > 0;

  const overallScore =
    hasWeightedProfile
      ? calculateWeightedOverallScore(
          {
            clauseNumbers:
              CLAUSE_NUMBERS,
            questions:
              allQuestions,
            answers,
            weights,
          }
        )
      : calculateSimpleOverallScore(
          answers
        );

  const maturityLevel =
    getMaturityLevel(
      overallScore
    );

  const clauseResults =
    CLAUSE_NUMBERS.map(
      (number) => ({
        number,
        title:
          CLAUSE_TITLES[
            number
          ],
        score:
          calculateClauseScore(
            number,
            allQuestions,
            answers
          ),
        weight:
          weights[number] ??
          null,
      })
    );

  const scoredClauses =
    clauseResults.filter(
      (result) =>
        result.score !== null
    );

  const strongestClause =
    scoredClauses.length
      ? scoredClauses.reduce(
          (best, current) =>
            current.score >
            best.score
              ? current
              : best
        )
      : null;

  const weakestClause =
    scoredClauses.length
      ? scoredClauses.reduce(
          (worst, current) =>
            current.score <
            worst.score
              ? current
              : worst
        )
      : null;

  const pdfDoc =
    await PDFDocument.create();

  pdfDoc.setTitle(
    `${cleanText(
      assessment.standard
    )} Executive Report`
  );

  pdfDoc.setAuthor(
    "RPG Intelligence"
  );

  pdfDoc.setSubject(
    "Business Assurance Executive Report"
  );

  const regular =
    await pdfDoc.embedFont(
      StandardFonts.Helvetica
    );

  const bold =
    await pdfDoc.embedFont(
      StandardFonts.HelveticaBold
    );

  const navy =
    rgb(
      7 / 255,
      26 / 255,
      51 / 255
    );

  const blue =
    rgb(
      20 / 255,
      89 / 255,
      217 / 255
    );

  const grey =
    rgb(
      97 / 255,
      112 / 255,
      135 / 255
    );

  const lightGrey =
    rgb(
      243 / 255,
      246 / 255,
      249 / 255
    );

  let page =
    pdfDoc.addPage([
      595.28,
      841.89,
    ]);

  let {
    width,
    height,
  } = page.getSize();

  let y = height - 60;

  function addPage() {
    page =
      pdfDoc.addPage([
        595.28,
        841.89,
      ]);

    ({
      width,
      height,
    } = page.getSize());

    y = height - 60;
  }

  function ensureSpace(
    requiredHeight = 50
  ) {
    if (
      y - requiredHeight <
      55
    ) {
      addPage();
    }
  }

  function drawText(
    text,
    {
      x = 50,
      size = 11,
      font = regular,
      color = navy,
      lineHeight = 15,
      maxLength = 82,
    } = {}
  ) {
    const lines =
      wrapText(
        text,
        maxLength
      );

    ensureSpace(
      lines.length *
        lineHeight +
        10
    );

    for (
      const line of lines
    ) {
      page.drawText(
        line,
        {
          x,
          y,
          size,
          font,
          color,
        }
      );

      y -= lineHeight;
    }

    return lines.length;
  }

  // COVER / HEADER

  page.drawRectangle({
    x: 0,
    y:
      height -
      220,
    width,
    height: 220,
    color: navy,
  });

  page.drawText(
    "RPG Intelligence",
    {
      x: 50,
      y:
        height -
        72,
      size: 14,
      font: bold,
      color:
        rgb(1, 1, 1),
    }
  );

  page.drawText(
    "Executive Assessment Report",
    {
      x: 50,
      y:
        height -
        120,
      size: 26,
      font: bold,
      color:
        rgb(1, 1, 1),
    }
  );

  page.drawText(
    cleanText(
      assessment.standard
    ),
    {
      x: 50,
      y:
        height -
        155,
      size: 16,
      font: regular,
      color:
        rgb(
          0.82,
          0.86,
          0.92
        ),
    }
  );

  y =
    height -
    275;

  drawText(
    "BUSINESS ASSURANCE SCORE",
    {
      size: 10,
      font: bold,
      color: grey,
    }
  );

  page.drawText(
    overallScore !== null
      ? `${overallScore}%`
      : "-",
    {
      x: 50,
      y: y - 48,
      size: 48,
      font: bold,
      color: blue,
    }
  );

  page.drawText(
    maturityLevel,
    {
      x: 190,
      y: y - 31,
      size: 20,
      font: bold,
      color: navy,
    }
  );

  y -= 85;

  drawText(
    `Assessment Status: ${cleanText(
      assessment.status
    )}`,
    {
      size: 11,
      color: grey,
    }
  );

  drawText(
    `Progress: ${progress.percentage}% (${progress.answered} of ${progress.total} questions answered)`,
    {
      size: 11,
      color: grey,
    }
  );

  y -= 15;

  // EXECUTIVE OVERVIEW

  drawText(
    "Executive Overview",
    {
      size: 18,
      font: bold,
      color: navy,
    }
  );

  y -= 5;

  const strongestText =
    strongestClause
      ? `The strongest assessed area is Clause ${strongestClause.number} - ${strongestClause.title}, scoring ${strongestClause.score}%.`
      : "No strongest clause has been identified.";

  const weakestText =
    weakestClause
      ? `The main improvement priority is Clause ${weakestClause.number} - ${weakestClause.title}, scoring ${weakestClause.score}%.`
      : "No priority clause has been identified.";

  drawText(
    `The current ${cleanText(
      assessment.standard
    )} Business Assurance Score is ${
      overallScore ?? 0
    }%, corresponding to the ${maturityLevel} maturity level. ${strongestText} ${weakestText}`,
    {
      size: 11,
      lineHeight: 16,
      color: grey,
      maxLength: 86,
    }
  );

  y -= 15;

  // CLAUSE RESULTS

  drawText(
    "Clause Results",
    {
      size: 18,
      font: bold,
    }
  );

  y -= 8;

  for (
    const result of clauseResults
  ) {
    ensureSpace(55);

    page.drawRectangle({
      x: 50,
      y: y - 35,
      width:
        width - 100,
      height: 45,
      color: lightGrey,
    });

    page.drawText(
      `Clause ${result.number}`,
      {
        x: 65,
        y: y - 8,
        size: 11,
        font: bold,
        color: navy,
      }
    );

    page.drawText(
      cleanText(
        result.title
      ),
      {
        x: 65,
        y: y - 24,
        size: 9,
        font: regular,
        color: grey,
      }
    );

    page.drawText(
      result.score !== null
        ? `${result.score}%`
        : "-",
      {
        x:
          width -
          110,
        y: y - 15,
        size: 18,
        font: bold,
        color: blue,
      }
    );

    if (
      result.weight !== null
    ) {
      page.drawText(
        `Weight ${result.weight}%`,
        {
          x:
            width -
            180,
          y: y - 28,
          size: 8,
          font: regular,
          color: grey,
        }
      );
    }

    y -= 58;
  }

  y -= 10;

  // PRIORITIES

  drawText(
    "Management Priorities",
    {
      size: 18,
      font: bold,
    }
  );

  y -= 5;

  const sortedResults =
    clauseResults
      .filter(
        (result) =>
          result.score !== null
      )
      .sort(
        (a, b) =>
          a.score - b.score
      );

  const priorities =
    sortedResults.slice(
      0,
      3
    );

  if (
    priorities.length === 0
  ) {
    drawText(
      "No priorities are available because the assessment has not been scored."
    );
  } else {
    priorities.forEach(
      (
        result,
        index
      ) => {
        drawText(
          `${index + 1}. Clause ${result.number} - ${result.title}: ${result.score}%`,
          {
            font: bold,
            size: 11,
            color: navy,
          }
        );

        drawText(
          "Review the supporting evidence, identify gaps, assign corrective actions and verify effectiveness before the next assessment.",
          {
            size: 10,
            color: grey,
            lineHeight: 14,
          }
        );

        y -= 8;
      }
    );
  }

  // DISCLAIMER

  y -= 10;

  drawText(
    "Important",
    {
      size: 14,
      font: bold,
    }
  );

  drawText(
    "This report is a management-system readiness assessment produced from information entered into RPG Intelligence. It is not a certification decision and does not replace an independent certification audit.",
    {
      size: 9,
      color: grey,
      lineHeight: 13,
    }
  );

  const pdfBytes =
    await pdfDoc.save();

  const filename =
    `RPG-${cleanText(
      assessment.standard
    )
      .replace(
        /\s+/g,
        "-"
      )}-Executive-Report.pdf`;

  return new Response(
    pdfBytes,
    {
      status: 200,
      headers: {
        "Content-Type":
          "application/pdf",
        "Content-Disposition":
          `attachment; filename="${filename}"`,
        "Cache-Control":
          "private, no-store",
      },
    }
  );
}
