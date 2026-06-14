import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { wafApi } from '../services/api';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: wafApi.getStats,
    refetchInterval: 10000,
    retry: false,
  });
}

export function useAttackLogs(params = {}) {
  return useQuery({
    queryKey: ['logs', params],
    queryFn: () => wafApi.getLogs(params),
    keepPreviousData: true,
    retry: false,
  });
}

export function useRules() {
  return useQuery({
    queryKey: ['rules'],
    queryFn: wafApi.getRules,
    retry: false,
  });
}

export function useCreateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: wafApi.createRule,
    onSuccess: () => qc.invalidateQueries(['rules']),
  });
}

export function useUpdateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => wafApi.updateRule(id, data),
    onSuccess: () => qc.invalidateQueries(['rules']),
  });
}

export function useDeleteRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: wafApi.deleteRule,
    onSuccess: () => qc.invalidateQueries(['rules']),
  });
}

export function useModelStats() {
  return useQuery({
    queryKey: ['ml', 'stats'],
    queryFn: wafApi.getModelStats,
    retry: false,
  });
}

export function useRunInference() {
  return useMutation({ mutationFn: wafApi.runInference });
}

export function useTriggerHealing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: wafApi.triggerHealing,
    onSuccess: () => qc.invalidateQueries(['healing']),
  });
}

export function useHealingHistory() {
  return useQuery({
    queryKey: ['healing', 'history'],
    queryFn: wafApi.getHealingHistory,
    retry: false,
  });
}
