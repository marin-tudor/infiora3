import type { Aggregate, Model, PipelineStage, Query } from 'mongoose';

const INDEXED_STAGES = new Set(['IXSCAN', 'COUNT_SCAN', 'DISTINCT_SCAN']);

const collectStages = (node: any, stages: string[] = []): string[] => {
  if (!node || typeof node !== 'object') {
    return stages;
  }

  if (typeof node.stage === 'string') {
    stages.push(node.stage);
  }

  Object.values(node).forEach((value) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => collectStages(entry, stages));
      return;
    }

    collectStages(value, stages);
  });

  return stages;
};

export const hasIndexedWinningPlan = (explainResult: any): boolean => {
  const winningPlan =
    explainResult?.queryPlanner?.winningPlan
    ?? explainResult?.stages?.find((stage: any) => stage?.$cursor)?.$cursor?.queryPlanner?.winningPlan
    ?? explainResult?.stages?.find((stage: any) => stage?.$geoNearCursor)?.$geoNearCursor?.queryPlanner?.winningPlan
    ?? explainResult?.queryPlan;

  if (!winningPlan) {
    return false;
  }

  return collectStages(winningPlan).some((stage) => INDEXED_STAGES.has(stage));
};

export const verifyIndexedWinningPlan = (label: string, explainResult: any): void => {
  if (!hasIndexedWinningPlan(explainResult)) {
    throw new Error(`Analytics explain check failed for ${label}: no indexed winning plan detected`);
  }
};

const isAnalyticsExplainEnabled = (): boolean => process.env['ENABLE_ANALYTICS_EXPLAIN'] === 'true';

export const runAggregateExplainCheck = async (
  label: string,
  model: Model<any>,
  pipeline: PipelineStage[],
): Promise<void> => {
  if (!isAnalyticsExplainEnabled()) {
    return;
  }

  const explainResult = await (model.aggregate(pipeline) as Aggregate<any[]>).explain('queryPlanner');

  verifyIndexedWinningPlan(label, explainResult);
};

export const runQueryExplainCheck = async (
  label: string,
  query: Query<any, any>,
): Promise<void> => {
  if (!isAnalyticsExplainEnabled()) {
    return;
  }

  const explainResult = await query.explain('queryPlanner');

  verifyIndexedWinningPlan(label, explainResult);
};
