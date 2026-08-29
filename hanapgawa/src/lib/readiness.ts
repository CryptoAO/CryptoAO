// Provider readiness.
//
// Signing up as a provider does almost nothing on its own. The job
// broadcast in src/lib/matching.ts only reaches people who have verified a
// phone AND picked at least one service category — so somebody who taps
// "gusto kong kumita dito" and stops there sits in the database forever,
// sees no work, and concludes the app is dead. They are not wrong from
// where they are standing; nobody ever told them what was missing.
//
// This is the telling. Each step says what it unlocks in plain terms,
// because "complete your profile" is not a reason and "hindi ka namin
// maipapadala ng bagong trabaho" is.
//
// Pure on purpose — no database — so the copy and the gating rules can be
// tested directly and the same model can render on the server or client.

export interface ReadinessInput {
  kycLevel: number;
  categoryCount: number;
  categoriesWithRate: number;
  bioLength: number;
  trustedContactCount: number;
  hasPhoto: boolean;
}

export type StepId = "verify" | "categories" | "rates" | "bio" | "kyc2" | "contact" | "photo";

export interface ReadinessStep {
  id: StepId;
  done: boolean;
  /** Blocks earning entirely, as opposed to merely helping. */
  blocking: boolean;
  title: string;
  titleEn: string;
  why: string;
  whyEn: string;
  href: string;
}

/** A short bio is worse than none — it reads as an abandoned profile. */
export const MIN_BIO = 30;

export function providerReadiness(input: ReadinessInput): {
  steps: ReadinessStep[];
  percent: number;
  blockedFrom: StepId[];
  ready: boolean;
} {
  const steps: ReadinessStep[] = [
    {
      id: "verify",
      done: input.kycLevel >= 1,
      blocking: true,
      title: "I-verify ang cellphone number mo",
      titleEn: "Verify your mobile number",
      why: "Hangga't hindi verified, hindi ka makakatanggap ng trabaho.",
      whyEn: "Until it is verified, you cannot take jobs.",
      href: "/me",
    },
    {
      id: "categories",
      done: input.categoryCount > 0,
      blocking: true,
      title: "Pumili ng serbisyong kaya mo",
      titleEn: "Pick the services you can do",
      why: "Dito namin ibase kung sinong papadalhan ng bagong trabaho. Kung wala kang napili, walang aabot sa'yo.",
      whyEn: "This decides who gets sent new jobs. Pick nothing, and nothing reaches you.",
      href: "/me?tab=provider",
    },
    {
      id: "rates",
      done: input.categoriesWithRate > 0,
      blocking: false,
      title: "Maglagay ng presyo sa serbisyo mo",
      titleEn: "Set a price for your service",
      why: "Mas mabilis magdesisyon ang kliyente kapag alam agad nila ang singil mo.",
      whyEn: "Clients decide faster when they can see your rate up front.",
      href: "/me?tab=provider",
    },
    {
      id: "bio",
      done: input.bioLength >= MIN_BIO,
      blocking: false,
      title: "Magsulat ng maikling intro",
      titleEn: "Write a short intro",
      why: "Ito ang unang binabasa ng kliyente. Ilang taon ka nang gumagawa nito? Ano ang dala mong gamit?",
      whyEn: "The first thing clients read. How long have you done this? What tools do you bring?",
      href: "/me?tab=provider",
    },
    {
      id: "kyc2",
      done: input.kycLevel >= 2,
      blocking: false,
      title: "I-verify ang valid ID mo",
      titleEn: "Verify your valid ID",
      why: "Kailangan ito para sa mga trabahong ₱2,000 pataas — doon ang malaking kita.",
      whyEn: "Required for jobs of ₱2,000 and up — where the real money is.",
      href: "/me?tab=kyc",
    },
    {
      id: "photo",
      done: input.hasPhoto,
      blocking: false,
      title: "Maglagay ng malinaw na profile photo",
      titleEn: "Add a clear profile photo",
      why: "Papasukin ka ng kliyente sa bahay nila. Mas madalas piliin ang may mukha kaysa sa walang larawan.",
      whyEn: "Clients are letting you into their home. A face gets picked far more often than a blank.",
      href: "/me?tab=provider",
    },
    {
      id: "contact",
      done: input.trustedContactCount > 0,
      blocking: false,
      title: "Magdagdag ng trusted contact",
      titleEn: "Add a trusted contact",
      why: "Sila ang unang matetext kapag pinindot mo ang SOS habang nasa trabaho ka.",
      whyEn: "The first person we text if you press SOS during a job.",
      href: "/me?tab=safety",
    },
  ];

  const done = steps.filter((s) => s.done).length;
  const blockedFrom = steps.filter((s) => s.blocking && !s.done).map((s) => s.id);

  return {
    steps,
    percent: Math.round((done / steps.length) * 100),
    blockedFrom,
    // "Ready" means jobs can actually reach them, not that the profile is
    // perfect. Nagging a working provider about a profile photo is noise.
    ready: blockedFrom.length === 0,
  };
}
