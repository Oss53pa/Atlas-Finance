/**
 * Atlas Finance Design System - Component Index
 * Central export file for all design system components
 */

// Button Components
export {
  Button,
  buttonVariants,
  type ButtonProps,
  type VariantProps,
} from './Button';

// Modal Components
export {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalComponent,
  modalVariants,
  type ModalProps,
  type ModalHeaderProps,
  type ModalBodyProps,
  type ModalFooterProps,
} from './Modal';

// Form Components
export {
  Input,
  inputVariants,
  labelVariants,
  helperTextVariants,
  type InputProps,
} from './Input';

export {
  Select,
  NativeSelect,
  CustomSelect,
  selectVariants,
  customSelectVariants,
  type SelectProps,
  type NativeSelectProps,
  type CustomSelectProps,
  type SelectOption,
} from './Select';

export {
  Checkbox,
  CheckboxGroup,
  checkboxVariants,
  type CheckboxProps,
  type CheckboxGroupProps,
} from './Checkbox';

export {
  Radio,
  RadioGroup,
  radioVariants,
  type RadioProps,
  type RadioGroupProps,
  type RadioOption,
} from './Radio';

// Layout Components
export {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  CardTitle,
  CardDescription,
  CardComponent,
  cardVariants,
  cardHeaderVariants,
  cardBodyVariants,
  cardFooterVariants,
  type CardProps,
  type CardHeaderProps,
  type CardBodyProps,
  type CardFooterProps,
  type CardTitleProps,
  type CardDescriptionProps,
} from './Card';

export {
  Panel,
  PanelHeader,
  PanelBody,
  PanelFooter,
  PanelTitle,
  CollapsiblePanel,
  PanelComponent,
  panelVariants,
  panelHeaderVariants,
  panelBodyVariants,
  panelFooterVariants,
  type PanelProps,
  type PanelHeaderProps,
  type PanelBodyProps,
  type PanelFooterProps,
  type PanelTitleProps,
  type CollapsiblePanelProps,
} from './Panel';

// Feedback Components
export {
  Alert,
  AlertTitle,
  AlertDescription,
  AlertActions,
  AlertComponent,
  alertVariants,
  type AlertProps,
  type AlertTitleProps,
  type AlertDescriptionProps,
  type AlertActionsProps,
} from './Alert';

export {
  Notification,
  NotificationContainer,
  NotificationComponent,
  notificationVariants,
  notificationContainerVariants,
  notificationProgressCSS,
  useNotifications,
  addNotification,
  removeNotification,
  clearAllNotifications,
  showNotification,
  showInfoNotification,
  showSuccessNotification,
  showWarningNotification,
  showErrorNotification,
  type NotificationProps,
  type NotificationContainerProps,
  type NotificationData,
} from './Notification';

// Data Display Components
export {
  Table,
  tableVariants,
  tableContainerVariants,
  tableHeaderVariants,
  tableHeaderCellVariants,
  tableBodyVariants,
  tableRowVariants,
  tableCellVariants,
  paginationVariants,
  type TableProps,
  type TableColumn,
  type SortConfig,
  type FilterConfig,
  type SelectionConfig,
  type PaginationConfig,
} from './Table';

// Re-export all as default for convenience
export const Components = {
  // Button
  Button,

  // Modal
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,

  // Forms
  Input,
  Select,
  NativeSelect,
  CustomSelect,
  Checkbox,
  CheckboxGroup,
  Radio,
  RadioGroup,

  // Layout
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  CardTitle,
  CardDescription,
  Panel,
  PanelHeader,
  PanelBody,
  PanelFooter,
  PanelTitle,
  CollapsiblePanel,

  // Feedback
  Alert,
  AlertTitle,
  AlertDescription,
  AlertActions,
  Notification,
  NotificationContainer,

  // Data Display
  Table,
};

export default Components;