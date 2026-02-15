/**
 * Integration tests for Phase 1 refactored services
 * Tests that services can be imported and have correct structure
 */

import { describe, it, expect } from 'vitest';
import accountingService from '@/services/accounting.service';
import securityService from '@/services/security.service';
import { thirdPartyService, thirdPartyAddressService, thirdPartyContactService } from '@/services/third-party.service';
import coreService from '@/services/core.service';
import API_ENDPOINTS from '@/config/apiEndpoints';

describe('Phase 1 - Services Integration', () => {
  describe('API Endpoints Configuration', () => {
    it('should have all required endpoint categories', () => {
      expect(API_ENDPOINTS.COMPANIES).toBeDefined();
      expect(API_ENDPOINTS.FISCAL_YEARS).toBeDefined();
      expect(API_ENDPOINTS.JOURNALS).toBeDefined();
      expect(API_ENDPOINTS.ACCOUNTS).toBeDefined();
      expect(API_ENDPOINTS.JOURNAL_ENTRIES).toBeDefined();
      expect(API_ENDPOINTS.ENTRY_LINES).toBeDefined();
      expect(API_ENDPOINTS.CURRENCIES).toBeDefined();
      expect(API_ENDPOINTS.USERS).toBeDefined();
      expect(API_ENDPOINTS.ROLES).toBeDefined();
      expect(API_ENDPOINTS.PERMISSIONS).toBeDefined();
      expect(API_ENDPOINTS.THIRD_PARTIES).toBeDefined();
      expect(API_ENDPOINTS.THIRD_PARTY_ADDRESSES).toBeDefined();
      expect(API_ENDPOINTS.THIRD_PARTY_CONTACTS).toBeDefined();
    });

    it('should have correct endpoint paths', () => {
      expect(API_ENDPOINTS.COMPANIES.LIST).toBe('/api/societes/');
      expect(API_ENDPOINTS.CURRENCIES.LIST).toBe('/api/devises/');
      expect(API_ENDPOINTS.USERS.LIST).toBe('/api/users/');
      expect(API_ENDPOINTS.THIRD_PARTIES.LIST).toBe('/api/tiers/');
    });

    it('should have dynamic endpoint functions', () => {
      expect(API_ENDPOINTS.COMPANIES.DETAIL('123')).toBe('/api/societes/123/');
      expect(API_ENDPOINTS.USERS.UPDATE('456')).toBe('/api/users/456/');
    });
  });

  describe('Accounting Service', () => {
    it('should have all required methods', () => {
      expect(typeof accountingService.getCompanies).toBe('function');
      expect(typeof accountingService.getCompanyById).toBe('function');
      expect(typeof accountingService.createCompany).toBe('function');
      expect(typeof accountingService.updateCompany).toBe('function');
      expect(typeof accountingService.deleteCompany).toBe('function');

      expect(typeof accountingService.getFiscalYears).toBe('function');
      expect(typeof accountingService.getJournals).toBe('function');
      expect(typeof accountingService.getChartOfAccounts).toBe('function');
      expect(typeof accountingService.getJournalEntries).toBe('function');
      expect(typeof accountingService.createJournalEntry).toBe('function');
    });
  });

  describe('Security Service', () => {
    it('should have all required methods', () => {
      expect(typeof securityService.getUsers).toBe('function');
      expect(typeof securityService.getUser).toBe('function');
      expect(typeof securityService.createUser).toBe('function');
      expect(typeof securityService.updateUser).toBe('function');
      expect(typeof securityService.deleteUser).toBe('function');

      expect(typeof securityService.getRoles).toBe('function');
      expect(typeof securityService.getPermissions).toBe('function');

      expect(typeof securityService.hasPermission).toBe('function');
      expect(typeof securityService.hasRole).toBe('function');
    });

    it('should have utility methods working correctly', () => {
      const superUser = {
        id: '1',
        username: 'admin',
        email: 'admin@test.com',
        is_active: true,
        is_staff: true,
        is_superuser: true,
        roles: [],
        permissions: []
      };

      const normalUser = {
        id: '2',
        username: 'user',
        email: 'user@test.com',
        is_active: true,
        is_staff: false,
        is_superuser: false,
        roles: ['accountant'],
        permissions: ['view_accounts']
      };

      // Superuser should have all permissions
      expect(securityService.hasPermission(superUser, 'any_permission')).toBe(true);

      // Normal user should only have assigned permissions
      expect(securityService.hasPermission(normalUser, 'view_accounts')).toBe(true);
      expect(securityService.hasPermission(normalUser, 'delete_everything')).toBe(false);

      // Role checking
      expect(securityService.hasRole(normalUser, 'accountant')).toBe(true);
      expect(securityService.hasRole(normalUser, 'admin')).toBe(false);
    });
  });

  describe('Third Party Service', () => {
    it('should have all required methods', () => {
      expect(typeof thirdPartyService.getAll).toBe('function');
      expect(typeof thirdPartyService.getById).toBe('function');
      expect(typeof thirdPartyService.create).toBe('function');
      expect(typeof thirdPartyService.update).toBe('function');
      expect(typeof thirdPartyService.delete).toBe('function');

      expect(typeof thirdPartyAddressService.getAll).toBe('function');
      expect(typeof thirdPartyContactService.getAll).toBe('function');

      // Backward compatibility
      expect(typeof thirdPartyService.getClients).toBe('function');
      expect(typeof thirdPartyService.getSuppliers).toBe('function');
    });
  });

  describe('Core Service', () => {
    it('should have all required methods', () => {
      expect(typeof coreService.getCurrencies).toBe('function');
      expect(typeof coreService.getCurrency).toBe('function');
      expect(typeof coreService.createCurrency).toBe('function');
      expect(typeof coreService.updateCurrency).toBe('function');
      expect(typeof coreService.deleteCurrency).toBe('function');

      expect(typeof coreService.getBaseCurrency).toBe('function');
      expect(typeof coreService.getActiveCurrencies).toBe('function');
    });
  });
});
