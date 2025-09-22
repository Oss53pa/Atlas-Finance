# Standards de Codage WiseBook

## Vue d'ensemble

Ce document définit les standards de codage pour le projet WiseBook, garantissant la cohérence, la maintenabilité et la qualité du code conformément aux standards internationaux.

## Standards TypeScript

### Naming Conventions

```typescript
// ✅ Correct
interface UserProfile {
  firstName: string;
  lastName: string;
  isActive: boolean;
}

class UserService {
  private readonly apiClient: ApiClient;

  async getUserById(id: string): Promise<UserProfile> {
    // Implementation
  }
}

const DEFAULT_TIMEOUT = 5000;
const USER_ROLES = ['admin', 'user', 'viewer'] as const;

// ❌ Incorrect
interface userprofile {
  first_name: string;
  Last_Name: string;
  IsActive: boolean;
}
```

### Type Safety

```typescript
// ✅ Utiliser des types stricts
interface ApiResponse<T> {
  data: T;
  status: 'success' | 'error';
  message?: string;
}

// Union types pour les états
type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// Éviter 'any', utiliser 'unknown' si nécessaire
function processData(data: unknown): string {
  if (typeof data === 'string') {
    return data.toUpperCase();
  }
  throw new Error('Invalid data type');
}

// ❌ Éviter
function processData(data: any): any {
  return data.toUpperCase();
}
```

### Utility Types

```typescript
// ✅ Utiliser les utility types TypeScript
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
}

type PublicUser = Omit<User, 'password'>;
type UserUpdate = Partial<Pick<User, 'name' | 'email'>>;
type CreateUser = Omit<User, 'id'>;
```

## Standards React

### Component Structure

```tsx
// ✅ Structure recommandée
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({
  variant,
  size = 'md',
  disabled = false,
  children,
  onClick,
}) => {
  const handleClick = useCallback(() => {
    if (!disabled && onClick) {
      onClick();
    }
  }, [disabled, onClick]);

  return (
    <button
      className={`btn btn--${variant} btn--${size}`}
      disabled={disabled}
      onClick={handleClick}
      type="button"
    >
      {children}
    </button>
  );
};
```

### Hooks Guidelines

```tsx
// ✅ Custom hooks
function useUserData(userId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchUser = async () => {
      try {
        setLoading(true);
        const userData = await userService.getUser(userId);
        if (!cancelled) {
          setUser(userData);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchUser();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { user, loading, error };
}
```

### Performance Optimization

```tsx
// ✅ Memoization appropriée
const UserList = React.memo<UserListProps>(({ users, onUserSelect }) => {
  const sortedUsers = useMemo(() => {
    return users.sort((a, b) => a.name.localeCompare(b.name));
  }, [users]);

  const handleUserClick = useCallback((userId: string) => {
    onUserSelect(userId);
  }, [onUserSelect]);

  return (
    <ul>
      {sortedUsers.map(user => (
        <UserItem
          key={user.id}
          user={user}
          onClick={handleUserClick}
        />
      ))}
    </ul>
  );
});
```

## Standards d'Accessibilité

### ARIA Labels

```tsx
// ✅ ARIA approprié
<button
  aria-label="Fermer la modal"
  aria-expanded={isOpen}
  onClick={onClose}
>
  <CloseIcon aria-hidden="true" />
</button>

<input
  type="email"
  aria-describedby="email-error"
  aria-invalid={!!emailError}
/>
{emailError && (
  <div id="email-error" role="alert">
    {emailError}
  </div>
)}

// Navigation
<nav aria-label="Navigation principale">
  <ul>
    <li>
      <a href="/dashboard" aria-current={isCurrentPage ? 'page' : undefined}>
        Tableau de bord
      </a>
    </li>
  </ul>
</nav>
```

### Keyboard Navigation

```tsx
// ✅ Support clavier complet
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Trap focus
      const firstFocusable = modalRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      firstFocusable?.focus();
    }
  }, [isOpen]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      onKeyDown={handleKeyDown}
      className="modal"
    >
      {children}
    </div>
  );
};
```

## Standards CSS

### Naming Convention (BEM)

```css
/* ✅ BEM Methodology */
.card {
  /* Block */
}

.card__header {
  /* Element */
}

.card__title {
  /* Element */
}

.card--featured {
  /* Modifier */
}

.card__header--large {
  /* Element + Modifier */
}
```

### CSS Custom Properties

```css
/* ✅ Variables CSS */
:root {
  /* Colors */
  --color-primary-500: #6A8A82;
  --color-secondary-500: #B87333;
  --color-neutral-50: #FAFAFA;
  --color-neutral-900: #1A1A1A;

  /* Spacing */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;

  /* Typography */
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --line-height-tight: 1.25;
  --line-height-normal: 1.5;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);

  /* Animation */
  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --easing-ease-out: cubic-bezier(0, 0, 0.2, 1);
}
```

### Responsive Design

```css
/* ✅ Mobile-first approach */
.container {
  padding: var(--space-md);
}

@media (min-width: 768px) {
  .container {
    padding: var(--space-lg);
  }
}

@media (min-width: 1024px) {
  .container {
    padding: var(--space-xl);
    max-width: 1200px;
    margin: 0 auto;
  }
}
```

## Standards de Sécurité

### Validation des Données

```typescript
// ✅ Validation avec Zod
import { z } from 'zod';

const UserSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Minimum 8 caractères').regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
    'Doit contenir majuscule, minuscule, chiffre et caractère spécial'
  ),
  age: z.number().min(18, 'Âge minimum 18 ans').max(120),
});

type User = z.infer<typeof UserSchema>;

function validateUser(data: unknown): User {
  return UserSchema.parse(data);
}
```

### Sanitisation

```typescript
// ✅ Sanitisation des entrées
import DOMPurify from 'dompurify';

function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em'],
    ALLOWED_ATTR: []
  });
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

### Protection XSS

```tsx
// ✅ Éviter dangerouslySetInnerHTML
// ❌ Jamais
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ Alternative sécurisée
<div>{sanitizeHtml(userInput)}</div>

// ✅ Pour le contenu riche
import { sanitizeHtml } from '../utils/security';

const SafeContent: React.FC<{ content: string }> = ({ content }) => {
  const sanitizedContent = useMemo(() => sanitizeHtml(content), [content]);

  return (
    <div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
  );
};
```

## Standards de Tests

### Unit Tests

```typescript
// ✅ Tests exhaustifs
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Button } from './Button';

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button variant="primary">Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = jest.fn();
    render(
      <Button variant="primary" onClick={handleClick}>
        Click me
      </Button>
    );

    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <Button variant="primary" disabled>
        Click me
      </Button>
    );
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### Integration Tests

```typescript
// ✅ Tests d'intégration
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserProvider } from '../providers/UserProvider';
import { UserProfile } from './UserProfile';

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <UserProvider>
      {ui}
    </UserProvider>
  );
};

describe('UserProfile Integration', () => {
  it('loads and displays user data', async () => {
    renderWithProviders(<UserProfile userId="123" />);

    expect(screen.getByText('Chargement...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });
});
```

## Standards de Documentation

### JSDoc

```typescript
/**
 * Calcule le montant total avec les taxes
 * @param amount - Montant de base
 * @param taxRate - Taux de taxe (ex: 0.20 pour 20%)
 * @param options - Options de calcul
 * @returns Le montant total avec taxes
 * @throws {Error} Si le montant ou le taux est négatif
 * @example
 * ```typescript
 * const total = calculateTotal(100, 0.20);
 * console.log(total); // 120
 * ```
 */
function calculateTotal(
  amount: number,
  taxRate: number,
  options: CalculationOptions = {}
): number {
  if (amount < 0 || taxRate < 0) {
    throw new Error('Le montant et le taux doivent être positifs');
  }

  return amount * (1 + taxRate);
}
```

### README Components

```markdown
# Button Component

## Description
Composant bouton réutilisable avec support d'accessibilité complet.

## Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | 'primary' \| 'secondary' \| 'danger' | - | Style du bouton |
| size | 'sm' \| 'md' \| 'lg' | 'md' | Taille du bouton |
| disabled | boolean | false | Désactive le bouton |

## Usage
```tsx
import { Button } from '@/components/ui/Button';

function App() {
  return (
    <Button variant="primary" onClick={() => console.log('Clicked!')}>
      Cliquez ici
    </Button>
  );
}
```
```

## Standards de Performance

### Métriques

```typescript
// ✅ Monitoring des performances
import { performanceMonitor } from '@/performance';

function useComponentPerformance(componentName: string) {
  const renderStartTime = useRef<number>();

  useLayoutEffect(() => {
    if (renderStartTime.current) {
      const renderTime = performance.now() - renderStartTime.current;
      performanceMonitor.trackComponentRender(componentName, renderTime);
    }
  });

  renderStartTime.current = performance.now();
}
```

### Optimizations

```tsx
// ✅ Optimisations appropriées
const ExpensiveList = React.memo<ListProps>(({ items, onItemClick }) => {
  const sortedItems = useMemo(() => {
    return items.sort((a, b) => a.priority - b.priority);
  }, [items]);

  return (
    <VirtualizedList
      items={sortedItems}
      itemHeight={60}
      height={400}
      renderItem={(item) => (
        <ListItem key={item.id} item={item} onClick={onItemClick} />
      )}
    />
  );
});
```

## Standards d'Erreurs

### Error Boundaries

```tsx
// ✅ Gestion d'erreurs robuste
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Envoyer à un service de monitoring
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="error-fallback">
          <h2>Une erreur est survenue</h2>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Réessayer
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## Outils et Configuration

### ESLint Configuration

```json
{
  "extends": [
    "@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "react/prop-types": "off",
    "jsx-a11y/no-autofocus": "off"
  }
}
```

### Prettier Configuration

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

---

*Ces standards sont régulièrement mis à jour selon les évolutions des bonnes pratiques et des retours d'expérience de l'équipe.*