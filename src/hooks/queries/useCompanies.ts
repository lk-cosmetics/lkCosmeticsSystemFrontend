import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companyService } from '@/services/company.service';
import type { CreateCompanyRequest } from '@/types';

// Query Keys
export const companiesKeys = {
  all: ['companies'] as const,
  lists: () => [...companiesKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) =>
    [...companiesKeys.lists(), filters] as const,
  details: () => [...companiesKeys.all, 'detail'] as const,
  detail: (id: number) => [...companiesKeys.details(), id] as const,
};

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Fetch all companies
 */
export function useCompanies() {
  return useQuery({
    queryKey: companiesKeys.lists(),
    queryFn: () => companyService.getAllCompanies(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Fetch single company by ID
 */
export function useCompany(id: number) {
  return useQuery({
    queryKey: companiesKeys.detail(id),
    queryFn: () => companyService.getCompanyById(id),
    enabled: !!id,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create new company
 */
export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCompanyRequest) =>
      companyService.createCompany(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: companiesKeys.lists() });
    },
  });
}

/**
 * Update existing company
 */
export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateCompanyRequest }) =>
      companyService.updateCompany(id, data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: companiesKeys.detail(variables.id),
      });
      void queryClient.invalidateQueries({ queryKey: companiesKeys.lists() });
    },
  });
}

/**
 * Partial update existing company
 */
export function usePartialUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<CreateCompanyRequest>;
    }) => companyService.partialUpdateCompany(id, data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: companiesKeys.detail(variables.id),
      });
      void queryClient.invalidateQueries({ queryKey: companiesKeys.lists() });
    },
  });
}

/**
 * Delete company
 */
export function useDeleteCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => companyService.deleteCompany(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: companiesKeys.lists() });
    },
  });
}
