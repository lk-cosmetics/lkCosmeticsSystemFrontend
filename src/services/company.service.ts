/**
 * Company Service
 * Handles all company-related API calls
 */

import { apiClient } from './axios';
import type { Company, CreateCompanyRequest, PaginatedResponse } from '@/types';
import { AUTH_CONFIG } from '@/utils/constants';

class CompanyService {
  /**
   * Get all companies (handles paginated response)
   */
  async getAllCompanies(): Promise<Company[]> {
    const response = await apiClient.get<PaginatedResponse<Company>>(AUTH_CONFIG.COMPANY_ENDPOINT);
    // Handle paginated response - extract results array
    if (response.data && 'results' in response.data) {
      return response.data.results;
    }
    // Fallback for non-paginated response
    return response.data as unknown as Company[];
  }

  /**
   * Get active companies only (handles paginated response)
   */
  async getActiveCompanies(): Promise<Company[]> {
    const response = await apiClient.get<PaginatedResponse<Company>>(
      `${AUTH_CONFIG.COMPANY_ENDPOINT}active/`
    );
    if (response.data && 'results' in response.data) {
      return response.data.results;
    }
    return response.data as unknown as Company[];
  }

  /**
   * Get company by ID
   */
  async getCompanyById(id: number): Promise<Company> {
    const response = await apiClient.get<Company>(
      `${AUTH_CONFIG.COMPANY_ENDPOINT}${id}/`
    );
    return response.data;
  }

  /**
   * Get company's brands
   */
  async getCompanyBrands(id: number): Promise<unknown[]> {
    const response = await apiClient.get<unknown[]>(
      `${AUTH_CONFIG.COMPANY_ENDPOINT}${id}/brands/`
    );
    return response.data;
  }

  /**
   * Create new company
   */
  async createCompany(data: CreateCompanyRequest): Promise<Company> {
    const formData = new FormData();

    // Append all fields to FormData
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'logo' && value instanceof File) {
          formData.append(key, value);
        } else if (typeof value === 'boolean') {
          formData.append(key, value.toString());
        } else {
          formData.append(key, String(value));
        }
      }
    });

    const response = await apiClient.post<Company>(
      AUTH_CONFIG.COMPANY_ENDPOINT,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }

  /**
   * Update company (full update)
   */
  async updateCompany(
    id: number,
    data: CreateCompanyRequest
  ): Promise<Company> {
    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'logo' && value instanceof File) {
          formData.append(key, value);
        } else if (typeof value === 'boolean') {
          formData.append(key, value.toString());
        } else {
          formData.append(key, String(value));
        }
      }
    });

    const response = await apiClient.put<Company>(
      `${AUTH_CONFIG.COMPANY_ENDPOINT}${id}/`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }

  /**
   * Partial update company
   */
  async partialUpdateCompany(
    id: number,
    data: Partial<CreateCompanyRequest>
  ): Promise<Company> {
    // Check if there's a file to upload
    const hasFile = data.logo instanceof File;

    if (hasFile) {
      // Use FormData for file uploads
      const formData = new FormData();

      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === 'logo' && value instanceof File) {
            formData.append(key, value);
          } else if (typeof value === 'boolean') {
            formData.append(key, value.toString());
          } else {
            formData.append(key, String(value));
          }
        }
      });

      const response = await apiClient.patch<Company>(
        `${AUTH_CONFIG.COMPANY_ENDPOINT}${id}/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    } else {
      // Use JSON for non-file updates
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { logo, ...jsonData } = data;
      const response = await apiClient.patch<Company>(
        `${AUTH_CONFIG.COMPANY_ENDPOINT}${id}/`,
        jsonData
      );
      return response.data;
    }
  }

  /**
   * Delete company
   */
  async deleteCompany(id: number): Promise<void> {
    await apiClient.delete(`${AUTH_CONFIG.COMPANY_ENDPOINT}${id}/`);
  }
}

export const companyService = new CompanyService();
