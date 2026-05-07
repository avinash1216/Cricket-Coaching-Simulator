import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatScore(score: { runs: number; wickets: number }): string {
  return `${score.runs}/${score.wickets}`;
}

export function getPhaseColor(phase: string): string {
  switch (phase) {
    case "powerplay":
      return "text-blue-400";
    case "middle":
      return "text-yellow-400";
    case "death":
      return "text-red-400";
    default:
      return "text-gray-400";
  }
}

export function getPhaseLabel(phase: string): string {
  switch (phase) {
    case "powerplay":
      return "⚡ Powerplay";
    case "middle":
      return "🎯 Middle Overs";
    case "death":
      return "🔥 Death Overs";
    default:
      return phase;
  }
}

export function getMeritColor(level: string): string {
  switch (level) {
    case "excellent":
      return "text-green-400";
    case "good":
      return "text-blue-400";
    case "average":
      return "text-yellow-400";
    case "poor":
      return "text-red-400";
    default:
      return "text-gray-400";
  }
}

export function getMeritEmoji(level: string): string {
  switch (level) {
    case "excellent":
      return "🏆";
    case "good":
      return "👍";
    case "average":
      return "😐";
    case "poor":
      return "👎";
    default:
      return "⏳";
  }
}

export function getTeamColor(team: string): string {
  const t = team.toLowerCase();
  if (t.includes("mumbai")) return "bg-ipl-mi";
  if (t.includes("chennai")) return "bg-ipl-csk";
  if (t.includes("bangalore") || t.includes("rcb")) return "bg-ipl-rcb";
  if (t.includes("kolkata")) return "bg-ipl-kkr";
  if (t.includes("hyderabad")) return "bg-ipl-srh";
  if (t.includes("delhi")) return "bg-ipl-dc";
  if (t.includes("punjab")) return "bg-ipl-pbks";
  if (t.includes("rajasthan")) return "bg-ipl-rr";
  if (t.includes("gujarat")) return "bg-ipl-gt";
  if (t.includes("lucknow")) return "bg-ipl-lsg";
  return "bg-gray-700";
}

export function getTeamShort(team: string): string {
  const t = team.toLowerCase();
  if (t.includes("mumbai")) return "MI";
  if (t.includes("chennai")) return "CSK";
  if (t.includes("bangalore") || t.includes("rcb")) return "RCB";
  if (t.includes("kolkata")) return "KKR";
  if (t.includes("hyderabad")) return "SRH";
  if (t.includes("delhi")) return "DC";
  if (t.includes("punjab")) return "PBKS";
  if (t.includes("rajasthan")) return "RR";
  if (t.includes("gujarat")) return "GT";
  if (t.includes("lucknow")) return "LSG";
  return team.substring(0, 3).toUpperCase();
}
