# RBAC Route Guard - Usage Examples

This document provides examples of how to use the enhanced Role-Based Access Control (RBAC) system in WiseBook ERP.

## Table of Contents

1. [Basic Usage](#basic-usage)
2. [Route-Level Protection](#route-level-protection)
3. [Component-Level Protection](#component-level-protection)
4. [Permission-Based Access](#permission-based-access)
5. [Custom Fallback](#custom-fallback)
6. [Auto-Detection from Route](#auto-detection-from-route)

## Basic Usage

### Single Role Requirement

Protect a route that only admins can access:

```tsx
import { ProtectedRoute } from '@/components/auth';

<Route
  path="/security"
  element={
    <ProtectedRoute requiredRole="admin">
      <SecurityDashboard />
    </ProtectedRoute>
  }
/>
```

### Multiple Roles (OR Logic)

Allow multiple roles to access a route:

```tsx
<Route
  path="/accounting"
  element={
    <ProtectedRoute requiredRole={['admin', 'comptable', 'manager']}>
      <AccountingDashboard />
    </ProtectedRoute>
  }
/>
```

## Route-Level Protection

### Using Outlet Pattern for Nested Routes

The `useOutlet` prop allows you to wrap multiple child routes:

```tsx
import { ProtectedRoute } from '@/components/auth';

<Route element={<ProtectedRoute requiredRole={['admin', 'comptable']} useOutlet />}>
  <Route path="/accounting" element={<AccountingDashboard />} />
  <Route path="/accounting/journals" element={<JournalsPage />} />
  <Route path="/accounting/entries" element={<EntriesPage />} />
  <Route path="/accounting/balance" element={<BalancePage />} />
</Route>
```

This is more efficient than wrapping each individual route.

### Combining with FeatureErrorBoundary

You can combine RBAC protection with error boundaries:

```tsx
<Route element={<FeatureErrorBoundary feature="Comptabilité" />}>
  <Route element={<ProtectedRoute requiredRole={['admin', 'comptable']} useOutlet />}>
    <Route path="/accounting" element={<AccountingDashboard />} />
    <Route path="/accounting/journals" element={<JournalsPage />} />
  </Route>
</Route>
```

## Component-Level Protection

### Protecting Individual Components

Use ProtectedRoute to wrap specific components:

```tsx
function AdminPanel() {
  return (
    <ProtectedRoute requiredRole="admin">
      <div>
        <h1>Admin Panel</h1>
        <AdminControls />
      </div>
    </ProtectedRoute>
  );
}
```

### Conditional Rendering Based on Role

```tsx
import { useAuth } from '@/contexts/AuthContext';

function Dashboard() {
  const { user } = useAuth();

  return (
    <div>
      <h1>Dashboard</h1>

      {/* Show to everyone */}
      <BasicStats />

      {/* Show only to admin and comptable */}
      <ProtectedRoute requiredRole={['admin', 'comptable']}>
        <AdvancedAnalytics />
      </ProtectedRoute>

      {/* Show only to admin */}
      <ProtectedRoute requiredRole="admin">
        <SystemSettings />
      </ProtectedRoute>
    </div>
  );
}
```

## Permission-Based Access

### Single Permission

```tsx
<ProtectedRoute requiredPermission="accounting.write">
  <AccountingForm />
</ProtectedRoute>
```

### Multiple Permissions (OR Logic)

User needs at least ONE of these permissions:

```tsx
<ProtectedRoute requiredPermission={['closures.validate', 'closures.approve']}>
  <ClosureValidationPanel />
</ProtectedRoute>
```

### Combining Roles and Permissions

Both can be used together (OR logic - user needs EITHER valid role OR valid permission):

```tsx
<ProtectedRoute
  requiredRole={['admin', 'comptable']}
  requiredPermission={['accounting.write', 'accounting.validate']}
>
  <AccountingForm />
</ProtectedRoute>
```

## Custom Fallback

### Custom Access Denied Message

```tsx
<ProtectedRoute
  requiredRole="admin"
  fallback={
    <div className="p-8 text-center">
      <h2 className="text-xl font-bold text-red-600">
        Accès réservé aux administrateurs
      </h2>
      <p className="mt-2 text-gray-600">
        Cette fonctionnalité n'est accessible qu'aux administrateurs système.
      </p>
      <button onClick={() => navigate('/')} className="mt-4 btn-primary">
        Retour à l'accueil
      </button>
    </div>
  }
>
  <AdminPanel />
</ProtectedRoute>
```

## Auto-Detection from Route

If you don't specify `requiredRole` or `requiredPermission`, the component will automatically check the `ROUTE_PERMISSIONS` constant based on the current URL:

```tsx
// In App.tsx - No explicit role/permission needed
<Route element={<ProtectedRoute useOutlet />}>
  {/* Auto-detects that /accounting/* requires ['admin', 'comptable', 'manager'] */}
  <Route path="/accounting" element={<AccountingDashboard />} />
  <Route path="/accounting/journals" element={<JournalsPage />} />
</Route>
```

The route permissions are defined in `src/constants/permissions.ts`:

```typescript
export const ROUTE_PERMISSIONS = {
  '/accounting/*': {
    roles: ['admin', 'comptable', 'manager'],
    permissions: ['accounting.read', 'accounting.write']
  },
  // ... other routes
};
```

## Complete App.tsx Example

Here's how to refactor your App.tsx to use the new RBAC system:

```tsx
import { ProtectedRoute } from '@/components/auth';

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Protected application with auto-detection */}
      <Route element={<ModernDoubleSidebarLayout />}>
        {/* Auto-protected based on route patterns */}
        <Route element={<ProtectedRoute useOutlet />}>
          {/* Security - admin only (auto-detected) */}
          <Route element={<FeatureErrorBoundary feature="Sécurité" />}>
            <Route path="/security" element={<SecurityDashboard />} />
            <Route path="/security/users" element={<UsersPage />} />
            <Route path="/security/roles" element={<RolesPage />} />
          </Route>

          {/* Accounting - admin, comptable, manager (auto-detected) */}
          <Route element={<FeatureErrorBoundary feature="Comptabilité" />}>
            <Route path="/accounting" element={<AccountingDashboard />} />
            <Route path="/accounting/journals" element={<JournalsPage />} />
            <Route path="/accounting/entries" element={<EntriesPage />} />
          </Route>

          {/* Closures - admin, comptable (auto-detected) */}
          <Route element={<FeatureErrorBoundary feature="Clôtures" />}>
            <Route path="/closures" element={<ClosureModulesIndex />} />
            <Route path="/closures/periodic" element={<CloturesPeriodiquesPage />} />
          </Route>
        </Route>
      </Route>

      {/* Error pages */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
```

## Best Practices

1. **Use `useOutlet` for route groups**: Instead of wrapping individual routes, use `useOutlet` to protect entire route trees.

2. **Define permissions centrally**: Keep all route permissions in `src/constants/permissions.ts` for easy maintenance.

3. **Leverage auto-detection**: Let the system auto-detect permissions from the route patterns when possible.

4. **Admin bypass**: Admins automatically bypass permission checks (but still need role checks).

5. **Role hierarchy**: Higher roles can access routes meant for lower roles (admin > manager > comptable > user > viewer).

6. **OR logic**: When multiple roles/permissions are provided, user needs to match ANY of them (not all).

7. **Custom fallbacks**: Use custom fallbacks for better UX when specific messaging is needed.

## Testing

To test RBAC protection:

1. Log in with different user roles
2. Try accessing protected routes
3. Verify correct redirect to /login when not authenticated
4. Verify AccessDenied component shows for unauthorized access
5. Test permission-based access if using granular permissions

## Migration from Old ProtectedRoute

Old syntax:
```tsx
<ProtectedRoute requiredRole="admin" fallback={...}>
  <Component />
</ProtectedRoute>
```

New syntax (same, but now supports arrays):
```tsx
<ProtectedRoute requiredRole={['admin', 'comptable']} fallback={...}>
  <Component />
</ProtectedRoute>
```

New Outlet pattern (recommended for route trees):
```tsx
<Route element={<ProtectedRoute requiredRole={['admin', 'comptable']} useOutlet />}>
  <Route path="/accounting" element={<Component1 />} />
  <Route path="/accounting/sub" element={<Component2 />} />
</Route>
```
