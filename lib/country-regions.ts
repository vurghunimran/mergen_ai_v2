import {
  communityLaunchRegionLabels,
  communityLaunchRegions,
  communityLaunchTotalMembers,
  type CommunityLaunchRegion
} from "@/lib/community-distribution";

export const surveyRegionOrder = [...communityLaunchRegionLabels];

export type SurveyRegion = CommunityLaunchRegion;

export const surveyRegionGroups = [...surveyRegionOrder];

export const surveyRegionTargets = Object.fromEntries(
  communityLaunchRegions.map((region) => [region.label, region.targetMembers])
) as Record<SurveyRegion, number>;

export const surveyRegionCountries = Object.fromEntries(
  communityLaunchRegions.map((region) => [region.label, [...region.countries]])
) as Record<SurveyRegion, string[]>;

export const surveyRegionTotalTarget = communityLaunchTotalMembers;
