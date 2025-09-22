# WiseBook Design System

A comprehensive, accessible, and reusable UI component library for the WiseBook application.

## Overview

The WiseBook Design System provides a complete set of standardized UI components built with:

- **React** + **TypeScript** for type safety and modern development
- **Tailwind CSS** for utility-first styling
- **Class Variance Authority (CVA)** for type-safe component variants
- **Full accessibility** support (WCAG 2.1 AA compliant)
- **Responsive design** for mobile, tablet, and desktop
- **Consistent theming** with design tokens

## Installation and Setup

```bash
# Install dependencies
npm install clsx class-variance-authority

# Import in your app
import { Button, Modal, Input } from '@/design-system';
```

## Theme System

The design system includes a comprehensive theme with:

- **Colors**: Primary, secondary, tertiary, neutral, and semantic colors
- **Typography**: Font families, sizes, weights, and line heights
- **Spacing**: Consistent spacing scale
- **Border Radius**: Rounded corner options
- **Shadows**: Elevation system
- **Breakpoints**: Responsive design breakpoints
- **Z-index**: Layering system

```typescript
import { theme, getColor, getSpacing } from '@/design-system';

// Use theme values
const primaryColor = getColor('primary', 500);
const spacing = getSpacing(4);
```

## Components

### Button

Comprehensive button component with multiple variants and states.

```tsx
import { Button } from '@/design-system';

// Basic usage
<Button variant="primary" size="md" onClick={handleClick}>
  Save Changes
</Button>

// With icons and loading state
<Button
  variant="outline"
  loading
  leftIcon={<SaveIcon />}
  disabled={isSubmitting}
>
  Saving...
</Button>

// All variants
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>
<Button variant="destructive">Delete</Button>
<Button variant="success">Success</Button>
```

### Modal

Accessible modal with focus management and ARIA attributes.

```tsx
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/design-system';

<Modal
  isOpen={isOpen}
  onClose={handleClose}
  size="lg"
  aria-labelledby="modal-title"
>
  <ModalHeader onClose={handleClose}>
    <span id="modal-title">Confirm Action</span>
  </ModalHeader>
  <ModalBody>
    Are you sure you want to continue?
  </ModalBody>
  <ModalFooter>
    <Button variant="outline" onClick={handleClose}>Cancel</Button>
    <Button variant="primary" onClick={handleConfirm}>Confirm</Button>
  </ModalFooter>
</Modal>
```

### Form Components

#### Input

```tsx
import { Input } from '@/design-system';

<Input
  label="Email"
  type="email"
  placeholder="Enter your email"
  required
  error={errors.email}
  helperText="We'll never share your email"
/>

// Password input with toggle
<Input
  label="Password"
  type="password"
  showPasswordToggle
  startIcon={<LockIcon />}
/>
```

#### Select

```tsx
import { Select } from '@/design-system';

// Native select
<Select
  label="Country"
  options={countries}
  value={selectedCountry}
  onChange={setSelectedCountry}
/>

// Custom select with search
<Select
  custom
  searchable
  label="User"
  options={users}
  value={selectedUser}
  onChange={setSelectedUser}
/>
```

#### Checkbox

```tsx
import { Checkbox, CheckboxGroup } from '@/design-system';

// Single checkbox
<Checkbox
  label="I agree to the terms and conditions"
  required
  error={errors.terms}
/>

// Checkbox group
<CheckboxGroup
  label="Select your interests"
  value={selectedInterests}
  onChange={setSelectedInterests}
>
  <Checkbox value="sports" label="Sports" />
  <Checkbox value="music" label="Music" />
  <Checkbox value="travel" label="Travel" />
</CheckboxGroup>
```

#### Radio

```tsx
import { Radio, RadioGroup } from '@/design-system';

// Radio group
<RadioGroup
  label="Payment method"
  name="payment"
  value={paymentMethod}
  onChange={setPaymentMethod}
  options={[
    { value: 'credit', label: 'Credit Card' },
    { value: 'debit', label: 'Debit Card' },
    { value: 'paypal', label: 'PayPal' },
  ]}
/>
```

### Layout Components

#### Card

```tsx
import { Card, CardHeader, CardBody, CardFooter } from '@/design-system';

<Card variant="elevated" hover="lift" interactive>
  <CardHeader>
    <CardTitle>Product Details</CardTitle>
    <CardDescription>View and edit product information</CardDescription>
  </CardHeader>
  <CardBody>
    <p>Card content goes here...</p>
  </CardBody>
  <CardFooter>
    <Button variant="outline">Cancel</Button>
    <Button>Save</Button>
  </CardFooter>
</Card>
```

#### Panel

```tsx
import { Panel, PanelHeader, PanelBody, CollapsiblePanel } from '@/design-system';

// Basic panel
<Panel variant="outlined">
  <PanelHeader>
    <PanelTitle>Settings</PanelTitle>
  </PanelHeader>
  <PanelBody>
    Panel content...
  </PanelBody>
</Panel>

// Collapsible panel
<CollapsiblePanel
  title="Advanced Settings"
  defaultCollapsed={true}
  variant="outlined"
>
  <p>Collapsible content...</p>
</CollapsiblePanel>
```

### Feedback Components

#### Alert

```tsx
import { Alert } from '@/design-system';

<Alert
  variant="success"
  title="Success"
  description="Your changes have been saved successfully."
  dismissible
  onDismiss={() => setShowAlert(false)}
/>

<Alert
  variant="error"
  title="Error"
  description="There was an error processing your request."
  actions={
    <Button size="sm" variant="outline">
      Try Again
    </Button>
  }
/>
```

#### Notification

```tsx
import {
  NotificationContainer,
  showSuccessNotification,
  showErrorNotification
} from '@/design-system';

// Add to your app root
<NotificationContainer position="top-right" maxNotifications={5} />

// Show notifications
const handleSave = async () => {
  try {
    await saveData();
    showSuccessNotification('Success', 'Data saved successfully');
  } catch (error) {
    showErrorNotification('Error', 'Failed to save data');
  }
};
```

### Data Display

#### Table

```tsx
import { Table } from '@/design-system';

const columns = [
  {
    key: 'name',
    header: 'Name',
    accessor: 'name',
    sortable: true,
    filterable: true
  },
  {
    key: 'email',
    header: 'Email',
    accessor: 'email',
    sortable: true,
    filterable: true
  },
  {
    key: 'actions',
    header: 'Actions',
    cell: (_, row) => <Button size="sm">Edit</Button>,
  },
];

<Table
  data={users}
  columns={columns}
  sortConfig={sortConfig}
  onSortChange={setSortConfig}
  paginationConfig={{
    currentPage: 1,
    pageSize: 10,
    totalItems: users.length,
    onPageChange: setCurrentPage,
  }}
  selectionConfig={{
    selectedRows: selectedUsers,
    onSelectionChange: setSelectedUsers,
  }}
  showFilters
/>
```

## Accessibility Features

All components include:

- **Keyboard navigation** support
- **Screen reader** compatibility
- **ARIA attributes** for semantic meaning
- **Focus management** for modals and complex components
- **Color contrast** compliance
- **Accessible form** labels and validation
- **Live regions** for dynamic content announcements

## Responsive Design

Components are built mobile-first and include:

- **Flexible layouts** that adapt to screen size
- **Touch-friendly** interactions on mobile
- **Responsive typography** scaling
- **Adaptive spacing** and sizing

## Customization

### Theme Customization

```typescript
import { theme } from '@/design-system';

// Extend or override theme values
const customTheme = {
  ...theme,
  colors: {
    ...theme.colors,
    primary: {
      ...theme.colors.primary,
      500: '#your-brand-color',
    },
  },
};
```

### Component Variants

```tsx
// Components use CVA for type-safe variants
import { cva } from 'class-variance-authority';

const customButtonVariants = cva(
  ['base-styles'],
  {
    variants: {
      size: {
        xs: 'text-xs px-2 py-1',
        sm: 'text-sm px-3 py-2',
        // ... more variants
      },
    },
  }
);
```

## Best Practices

1. **Use semantic HTML** elements when possible
2. **Provide accessible labels** for all interactive elements
3. **Test with keyboard navigation** and screen readers
4. **Follow the design system** spacing and color guidelines
5. **Use loading states** for async operations
6. **Provide clear error messages** with recovery actions
7. **Keep interfaces consistent** across the application

## Browser Support

- **Chrome** 90+
- **Firefox** 88+
- **Safari** 14+
- **Edge** 90+

## Performance

- **Tree-shakable** exports for minimal bundle size
- **Optimized animations** using CSS transforms
- **Efficient re-renders** with React.memo where appropriate
- **Lazy loading** support for large data sets

## Contributing

When adding new components:

1. Follow the existing patterns and conventions
2. Include comprehensive TypeScript types
3. Add accessibility attributes and keyboard support
4. Include loading and error states
5. Write clear documentation and examples
6. Test across different devices and screen readers

## License

Part of the WiseBook application. All rights reserved.