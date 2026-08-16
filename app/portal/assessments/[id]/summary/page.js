import { redirect } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/server";

import {
  calculateClauseScore,
  calculateSimpleOverallScore,
  calculateWeightedOverallScore,
  calculateProgress,
} from "../scoring";
