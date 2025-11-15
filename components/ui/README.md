# UI Components Library

A collection of reusable UI components for the Exdata Studio application.

## Components

### Form Components

#### Input
Basic text input field with label and error handling.

```tsx
import { Input } from '@/components/ui'

<Input
  label="Email address"
  type="email"
  placeholder="you@example.com"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={errors.email}
  helperText="We'll never share your email"
/>
```

#### PasswordInput
Password input with show/hide toggle.

```tsx
import { PasswordInput } from '@/components/ui'

<PasswordInput
  label="Password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  showToggle={true}
  helperText="Must be at least 8 characters"
/>
```

#### TextArea
Multi-line text input.

```tsx
import { TextArea } from '@/components/ui'

<TextArea
  label="Message"
  rows={6}
  value={message}
  onChange={(e) => setMessage(e.target.value)}
  error={errors.message}
/>
```

#### Select
Dropdown select component.

```tsx
import { Select } from '@/components/ui'

<Select
  label="Country"
  options={[
    { value: 'us', label: 'United States' },
    { value: 'uk', label: 'United Kingdom' },
  ]}
  value={country}
  onChange={(e) => setCountry(e.target.value)}
/>
```

#### Checkbox
Checkbox input with label.

```tsx
import { Checkbox } from '@/components/ui'

<Checkbox
  label="I agree to the terms and conditions"
  checked={acceptTerms}
  onChange={(e) => setAcceptTerms(e.target.checked)}
/>
```

#### Button
Flexible button component with multiple variants.

```tsx
import { Button } from '@/components/ui'

// Primary button
<Button variant="primary" size="md" onClick={handleSubmit}>
  Submit
</Button>

// Secondary button with icon
<Button
  variant="secondary"
  icon={<span className="material-symbols-outlined">save</span>}
  iconPosition="left"
>
  Save Changes
</Button>

// Full width button
<Button variant="primary" fullWidth>
  Login
</Button>
```

### UI Components

#### Alert
Alert message component with variants.

```tsx
import { Alert } from '@/components/ui'

<Alert variant="error" title="Error" onClose={handleClose}>
  Something went wrong
</Alert>

<Alert variant="success">
  File uploaded successfully!
</Alert>
```

#### Card
Container component with optional hover effects.

```tsx
import { Card } from '@/components/ui'

<Card hover padding="md" onClick={handleClick}>
  <h3>Card Title</h3>
  <p>Card content</p>
</Card>
```

#### IconButton
Button with only an icon.

```tsx
import { IconButton } from '@/components/ui'

<IconButton
  icon="delete"
  variant="danger"
  size="md"
  title="Delete file"
  onClick={handleDelete}
/>
```

#### Table
Reusable table component.

```tsx
import { Table } from '@/components/ui'

const columns = [
  {
    key: 'name',
    header: 'Name',
    render: (value, row) => <strong>{value}</strong>,
  },
  {
    key: 'email',
    header: 'Email',
  },
  {
    key: 'actions',
    header: 'Actions',
    align: 'right',
    render: (_, row) => (
      <IconButton icon="edit" onClick={() => handleEdit(row)} />
    ),
  },
]

<Table
  columns={columns}
  data={users}
  onRowClick={(row) => handleRowClick(row)}
  emptyMessage="No users found"
/>
```

#### Tabs
Tab navigation component.

```tsx
import { Tabs } from '@/components/ui'

const tabs = [
  {
    id: 'tab1',
    label: 'Tab 1',
    content: <div>Content for tab 1</div>,
  },
  {
    id: 'tab2',
    label: 'Tab 2',
    content: <div>Content for tab 2</div>,
  },
]

<Tabs tabs={tabs} orientation="vertical" defaultTab="tab1" />
```

#### FileUpload
Drag and drop file upload component.

```tsx
import { FileUpload } from '@/components/ui'

<FileUpload
  accept=".xlsx,.xls,.csv"
  onFileSelect={(files) => handleFileSelect(files)}
  onDrop={(files) => handleDrop(files)}
  maxSize={10 * 1024 * 1024} // 10MB
  error={uploadError}
/>
```

## Component Props

### Common Props

Most form components share these common props:
- `label`: Label text (optional)
- `error`: Error message (optional)
- `helperText`: Helper text shown below input (optional)
- `fullWidth`: Make component full width (default: `true`)
- `className`: Additional CSS classes

### Button Variants

- `primary`: Black background, white text (default)
- `secondary`: White background, black border
- `outline`: White background, subtle border
- `ghost`: Transparent background
- `danger`: Red variant for destructive actions

### Button Sizes

- `sm`: Small (px-3 py-1.5 text-xs)
- `md`: Medium (px-4 py-2 text-sm) - default
- `lg`: Large (px-6 py-2.5 text-sm)

### Alert Variants

- `error`: Red alert
- `success`: Green alert
- `warning`: Yellow alert
- `info`: Blue alert (default)

## Usage Examples

See the following pages for real-world usage:
- `app/login/page.tsx` - Form components
- `app/dashboard/page.tsx` - Table component
- `components/TabsSection.tsx` - Tabs component

