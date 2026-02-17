# Dark Mode Quick Reference Guide

A quick reference for developers working with dark mode in the barbershop SaaS application.

## 🚀 Quick Start

### Using Dark Mode in a Component

```typescript
// 1. Simple approach - just use dark: classes
export function MyComponent() {
  return (
    <div className="bg-white dark:bg-slate-900 p-4">
      <h2 className="text-slate-900 dark:text-slate-100">Title</h2>
      <p className="text-slate-600 dark:text-slate-400">Content</p>
    </div>
  );
}

// 2. Conditional approach - when you need dynamic behavior
import { useTheme } from '@/lib/ThemeContext';

export function MyComponent() {
  const { theme } = useTheme();
  
  return (
    <Chart
      background={theme === 'dark' ? '#050E1F' : '#ffffff'}
      textColor={theme === 'dark' ? '#F1F5F9' : '#171717'}
    />
  );
}
```

## 🎨 Common Patterns

### Card Component
```tsx
<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-6 shadow-md dark:shadow-lg">
  {/* content */}
</div>
```

### Button Component
```tsx
<button className="
  bg-blue-600 dark:bg-blue-600
  hover:bg-blue-700 dark:hover:bg-blue-700
  text-white
  px-4 py-2 rounded-lg
  border border-blue-700 dark:border-blue-600
">
  Click Me
</button>
```

### Form Input
```tsx
<input 
  className="
    w-full px-4 py-2
    bg-slate-50 dark:bg-slate-900
    text-slate-900 dark:text-slate-100
    border border-slate-300 dark:border-slate-700
    rounded-lg
    focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
    placeholder-slate-500 dark:placeholder-slate-400
  "
  placeholder="Enter text..."
/>
```

### Alert Box
```tsx
<div className="
  bg-red-50 dark:bg-red-900/20
  border border-red-200 dark:border-red-800
  rounded-lg p-4
">
  <p className="text-red-800 dark:text-red-300">
    Error message
  </p>
</div>
```

### Section with Heading
```tsx
<section className="bg-white dark:bg-slate-950 py-12 px-4">
  <div className="max-w-6xl mx-auto">
    <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-8">
      Section Title
    </h2>
    <p className="text-slate-600 dark:text-slate-400">
      Content here
    </p>
  </div>
</section>
```

### Table
```tsx
<table className="w-full">
  <thead>
    <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
      <th className="text-slate-900 dark:text-slate-100 text-left px-4 py-2">
        Column
      </th>
    </tr>
  </thead>
  <tbody>
    <tr className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
      <td className="text-slate-600 dark:text-slate-400 px-4 py-2">
        Data
      </td>
    </tr>
  </tbody>
</table>
```

## 🎯 Color Reference

### Backgrounds
```
Light Mode:
- Page: #ffffff (bg-white)
- Card: #ffffff (bg-white)
- Hover: #f3f4f6 (bg-slate-100)

Dark Mode:
- Page: #050E1F (bg-slate-950)
- Card: #1E293B (bg-slate-900)
- Hover: #0F172A (bg-slate-900)
```

### Text
```
Light Mode:
- Primary: #171717 (text-slate-900)
- Secondary: #666666 (text-slate-600)
- Tertiary: #999999 (text-slate-500)

Dark Mode:
- Primary: #F1F5F9 (text-slate-100)
- Secondary: #CBD5E1 (text-slate-400)
- Tertiary: #94A3B8 (text-slate-400)
```

### Borders
```
Light Mode: #e5e7eb (border-slate-200)
Dark Mode: #334155 (border-slate-700)
```

### Accents
```
Orange: #FF6B35 (accent-orange-600)
Teal: #2DD4BF (accent-teal-500)
```

## 🔧 Tailwind Class Cheat Sheet

### Text Colors
```
dark:text-slate-50     → #F8FAFC
dark:text-slate-100    → #F1F5F9
dark:text-slate-300    → #CBD5E1
dark:text-slate-400    → #94A3B8
dark:text-slate-600    → #475569
```

### Background Colors
```
dark:bg-slate-800      → #1E293B
dark:bg-slate-900      → #0F172A
dark:bg-slate-950      → #020617 (not used, use 900)
```

### Border Colors
```
dark:border-slate-700  → #334155
dark:border-slate-800  → #1E293B
```

### Opacity Variants
```
dark:bg-slate-900/20   → 20% opacity
dark:bg-slate-900/30   → 30% opacity
dark:bg-slate-900/50   → 50% opacity
```

## 📱 Mobile-Specific Dark Mode

Mobile behavior should mirror desktop:

```tsx
// No need for mobile-specific dark mode classes
// Tailwind handles all breakpoints automatically

<div className="
  text-sm sm:text-base md:text-lg
  bg-white dark:bg-slate-900
  p-2 sm:p-4 md:p-6
">
  Works on all devices
</div>
```

## 🎨 Component Library Classes

### Ready-to-use Button Variants
```tsx
// Primary button
className="bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-700 text-white"

// Secondary button  
className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100"

// Ghost button
className="hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100"

// Danger button
className="bg-red-600 dark:bg-red-600 hover:bg-red-700 dark:hover:bg-red-700 text-white"
```

### Input States
```tsx
// Base input
className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"

// Focused input
className="focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"

// Error input
className="border border-red-500 dark:border-red-600"

// Disabled input
className="opacity-50 cursor-not-allowed"
```

## 🔄 Theme Toggle Usage

### In Navigation/Navbar
```tsx
import { ThemeToggle } from '@/components/ThemeToggle';

export function Navbar() {
  return (
    <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between p-4">
        <div>Logo</div>
        <ThemeToggle />
      </div>
    </nav>
  );
}
```

### Accessing Theme in Component
```tsx
import { useTheme } from '@/lib/ThemeContext';

export function MyComponent() {
  const { theme, toggleTheme, setTheme } = useTheme();
  
  // theme: 'light' | 'dark'
  // toggleTheme(): void
  // setTheme(newTheme: 'light' | 'dark'): void
  
  return (
    <button onClick={toggleTheme}>
      Current: {theme}
    </button>
  );
}
```

## 📊 Charts & Data Visualization

### For Recharts
```tsx
import { useTheme } from '@/lib/ThemeContext';
import { LineChart, Line } from 'recharts';

export function MyChart() {
  const { theme } = useTheme();
  
  const colors = {
    light: {
      background: '#ffffff',
      text: '#171717',
      grid: '#e5e7eb',
      line1: '#3b82f6',
    },
    dark: {
      background: '#050E1F',
      text: '#F1F5F9',
      grid: '#334155',
      line1: '#60a5fa',
    },
  };
  
  const config = theme === 'dark' ? colors.dark : colors.light;
  
  return (
    <LineChart data={data} style={{ backgroundColor: config.background }}>
      <Line stroke={config.line1} />
    </LineChart>
  );
}
```

## 🎯 Common Mistakes to Avoid

### ❌ Don't
```tsx
// Hard-coded colors
<div style={{ backgroundColor: '#ffffff' }}>Bad</div>

// Forgetting dark variant
<div className="bg-white">Missing dark mode</div>

// Inconsistent color names
<div className="dark:bg-slate-900 dark:text-slate-100 dark:border-gray-700">Mixed naming</div>

// Not testing contrast
<div className="text-slate-500 dark:text-slate-500">Same color, bad in both modes</div>
```

### ✅ Do
```tsx
// Use Tailwind classes
<div className="bg-white dark:bg-slate-900">Good</div>

// Always add dark variant
<div className="text-slate-900 dark:text-slate-100">Proper</div>

// Use consistent naming
<div className="dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700">Consistent</div>

// Check contrast ratios
<div className="text-slate-900 dark:text-slate-100">WCAG AA</div>
```

## 🧪 Testing Dark Mode in Component

```tsx
// Quick test
import { render } from '@testing-library/react';
import { ThemeProvider } from '@/lib/ThemeContext';

test('renders in dark mode', () => {
  const { container } = render(
    <ThemeProvider>
      <MyComponent />
    </ThemeProvider>
  );
  
  // Manually toggle class
  document.documentElement.classList.add('dark');
  
  // Check rendering
  expect(container).toMatchSnapshot();
});
```

## 📚 File Reference

| File | Purpose | Location |
|------|---------|----------|
| `tailwind.config.ts` | Dark mode configuration | Root |
| `lib/ThemeContext.tsx` | Theme state management | `/lib/` |
| `components/ThemeToggle.tsx` | Toggle button | `/components/` |
| `app/globals.css` | Global dark mode styles | `/app/` |
| `app/layout.tsx` | Theme provider setup | `/app/` |

## 🔗 Related Files

- Dark Mode Implementation: `DARK_MODE_IMPLEMENTATION.md`
- Testing Guide: `DARK_MODE_TESTING.md`
- This Guide: `DARK_MODE_QUICK_REFERENCE.md`

## 💡 Pro Tips

1. **Use CSS Variables for dynamic values**
   ```tsx
   <div style={{ color: 'var(--foreground)' }}>
     Automatically adapts to theme
   </div>
   ```

2. **Leverage Tailwind's dark mode prefixes**
   ```
   dark: prefix on any class = dark mode variant
   ```

3. **Test in multiple browsers**
   - Chrome, Safari, Firefox all handle CSS slightly different
   - Use Inspector to toggle class manually

4. **Performance: Classes beat JS**
   - `className="dark:bg-slate-900"` is faster than conditional inline styles

5. **Accessibility first**
   - Use contrast checkers: webAIM.org/resources/contrastchecker/
   - Test with keyboard navigation
   - Screen reader test occasionally

## 🚀 Adding Dark Mode to New Component

1. **Identify all colors used**
   - Text colors
   - Background colors
   - Border colors
   - Accent colors

2. **Map to Tailwind classes**
   - Light mode: white, slate-900, slate-600
   - Dark mode: slate-900, slate-100, slate-400

3. **Add dark: variants**
   ```tsx
   className="bg-white dark:bg-slate-900"
   ```

4. **Test in both modes**
   - Open DevTools
   - Right-click → Inspect
   - Toggle `<html class="dark">` manually
   - Verify all text is readable

5. **Check contrast**
   - Use WebAIM tool
   - Must be ≥4.5:1 for text
   - Must be ≥3:1 for UI

## 📞 Support

For dark mode questions:
1. Check `DARK_MODE_IMPLEMENTATION.md` for detailed info
2. Check `DARK_MODE_TESTING.md` for testing procedures
3. Review this Quick Reference for common patterns
4. Inspect existing components for examples

---

**Last Updated**: February 16, 2026
**Version**: 1.0.0
