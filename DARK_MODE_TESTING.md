# Dark Mode Testing Guide

## Test Plan Overview

This document provides comprehensive testing procedures for the dark mode implementation across all pages and components.

## 🎯 Testing Checklist

### 1. Theme Toggle Functionality

#### Test Case 1.1: Toggle Button Visibility
- [ ] Navigate to any page with navbar
- [ ] Verify theme toggle button is visible
- [ ] Button displays sun icon in light mode
- [ ] Button displays moon icon in dark mode
- [ ] Button has proper contrast in both modes

#### Test Case 1.2: Click Toggle
- [ ] Click theme toggle button
- [ ] Page immediately switches to dark mode
- [ ] All elements update their colors
- [ ] No flashing or color jump
- [ ] Transition is smooth (~200ms)
- [ ] Click again to return to light mode

#### Test Case 1.3: Multiple Toggles
- [ ] Toggle theme 5+ times
- [ ] Colors always correct
- [ ] No memory leaks or performance degradation
- [ ] Toggle always responsive

---

### 2. Color & Contrast Testing

#### Test Case 2.1: Light Mode Colors
- [ ] Background: #ffffff (white)
- [ ] Text: #171717 (near black)
- [ ] Borders: #e5e7eb (light gray)
- [ ] All text readable
- [ ] Contrast ratio ≥ 4.5:1

#### Test Case 2.2: Dark Mode Colors
- [ ] Background: #050E1F (very dark navy)
- [ ] Text: #F1F5F9 (light slate)
- [ ] Borders: #334155 (medium slate)
- [ ] Secondary text: #CBD5E1 (medium-light slate)
- [ ] All text readable
- [ ] Contrast ratio ≥ 4.5:1

#### Test Case 2.3: Component Colors
- [ ] Buttons maintain contrast
- [ ] Form inputs readable
- [ ] Alert messages visible
- [ ] Badge text readable
- [ ] Links distinguish from text
- [ ] Hover states visible
- [ ] Focus states visible

#### Test Case 2.4: Accent Colors
- [ ] Orange accent (#FF6B35) in dark mode:
  - [ ] Visible against dark background
  - [ ] Not too bright/harsh
  - [ ] Contrast ≥ 3:1
- [ ] Teal accent (#2DD4BF) in dark mode:
  - [ ] Visible against dark background
  - [ ] Good contrast
  - [ ] Contrast ≥ 3:1

---

### 3. Page-by-Page Testing

#### Test Case 3.1: Authentication Pages

**Login Page** (`/app/login`)
- [ ] Light mode rendering
- [ ] Dark mode rendering
- [ ] Form inputs visible in both modes
- [ ] Error messages visible
- [ ] Button contrast good
- [ ] Developer info box styled correctly

**Signup Page** (`/app/signup`)
- [ ] Light mode rendering
- [ ] Dark mode rendering
- [ ] Form inputs clear
- [ ] Success message styled correctly
- [ ] All form labels visible

#### Test Case 3.2: Dashboard Pages

**Main Dashboard** (`/app/dashboard`)
- [ ] Header visible in both modes
- [ ] Navigation clear
- [ ] Cards readable
- [ ] Charts display correctly
- [ ] Tables formatted well
- [ ] Sidebar (if exists) styled properly

**Admin Dashboard** (`/app/admin`)
- [ ] Admin controls visible
- [ ] Statistics readable
- [ ] Forms accessible
- [ ] Modals readable

**Barber Dashboard** (`/app/barber`)
- [ ] Schedule visible
- [ ] Appointments clear
- [ ] Status badges visible
- [ ] Performance metrics readable

#### Test Case 3.3: Appointment Pages

**Appointment Booking** (`/app/appointments`)
- [ ] Calendar visible and usable
- [ ] Time slots clear
- [ ] Selected dates highlighted
- [ ] Form fields readable

**Appointment List**
- [ ] Table rows distinguishable
- [ ] Row hover states visible
- [ ] Status indicators clear
- [ ] Action buttons accessible

#### Test Case 3.4: Portal Pages

**Public Booking Flow**
- [ ] Barber selector cards visible
- [ ] Images display correctly
- [ ] Rating stars visible
- [ ] Specialties badges styled
- [ ] Selection highlighting clear

**Time Slot Picker**
- [ ] Calendar grid visible
- [ ] Available slots clear
- [ ] Selected slot highlighted
- [ ] Navigation buttons visible

**Payment Page**
- [ ] Form fields visible
- [ ] Card input readable
- [ ] Buttons accessible
- [ ] Confirmation message clear

#### Test Case 3.5: Analytics Pages

**Analytics Dashboard**
- [ ] Summary cards styled
- [ ] Charts render correctly
- [ ] Legend visible
- [ ] Tooltip backgrounds appropriate
- [ ] Data labels readable

**Revenue Chart**
- [ ] Chart lines visible
- [ ] Axes readable
- [ ] Grid lines appropriate
- [ ] Colors distinguish data series

**Heatmap**
- [ ] Color scale visible
- [ ] Values readable
- [ ] Legend clear

#### Test Case 3.6: Landing Page

**Hero Section**
- [ ] Text visible and readable
- [ ] CTA buttons clear
- [ ] Background gradients appropriate
- [ ] Images visible

**Features Section**
- [ ] Card backgrounds appropriate
- [ ] Feature icons visible
- [ ] Text readable
- [ ] Layout intact

**Pricing Section**
- [ ] Cards distinguished
- [ ] Price text readable
- [ ] Feature lists clear
- [ ] CTA buttons visible

**Testimonials**
- [ ] Quote text readable
- [ ] Author names clear
- [ ] Ratings visible
- [ ] Images display

**FAQ Section**
- [ ] Accordion items distinct
- [ ] Expanded state clear
- [ ] Text readable
- [ ] Icons visible

**Footer**
- [ ] Links visible
- [ ] Background appropriate
- [ ] Copyright text readable

---

### 4. Component Testing

#### Test Case 4.1: Form Components

**Input Fields**
- [ ] Background color correct
- [ ] Text color correct
- [ ] Placeholder text visible
- [ ] Border visible
- [ ] Focus ring visible
- [ ] Error states clear
- [ ] Disabled state distinguishable

**Select Dropdowns**
- [ ] Closed state styled
- [ ] Open dropdown visible
- [ ] Options readable
- [ ] Selected option highlighted
- [ ] Hover states visible

**Checkboxes & Radios**
- [ ] Checked state visible
- [ ] Unchecked state visible
- [ ] Labels associated
- [ ] Hover states clear
- [ ] Focus states visible

**Text Areas**
- [ ] Background visible
- [ ] Text readable
- [ ] Scrollbar styled for dark mode
- [ ] Resizing works

#### Test Case 4.2: Button Components

**Primary Button**
- [ ] Light mode: visible, good contrast
- [ ] Dark mode: visible, good contrast
- [ ] Hover state clear
- [ ] Active/pressed state clear
- [ ] Disabled state distinguishable
- [ ] Text color readable

**Secondary Button**
- [ ] Light mode styling correct
- [ ] Dark mode styling correct
- [ ] Border visible in both modes

**Ghost/Outline Button**
- [ ] Light mode readable
- [ ] Dark mode readable
- [ ] Hover state appropriate

#### Test Case 4.3: Card Components

**Base Card**
- [ ] Light mode: white background
- [ ] Dark mode: slate-900 background
- [ ] Border visible in both
- [ ] Shadow appropriate
- [ ] Content readable
- [ ] Hover state (if interactive)

**Feature Card**
- [ ] Icon visible
- [ ] Title readable
- [ ] Description clear
- [ ] Styling consistent

#### Test Case 4.4: Modal/Overlay

**Modal Dialog**
- [ ] Background overlay visible
- [ ] Modal background contrasted
- [ ] Title readable
- [ ] Content readable
- [ ] Close button visible
- [ ] Buttons accessible

**Dropdown Menu**
- [ ] Menu items readable
- [ ] Hover states visible
- [ ] Separators visible
- [ ] Background appropriate

#### Test Case 4.5: Table Components

**Table Headers**
- [ ] Light mode: appropriate background
- [ ] Dark mode: appropriate background
- [ ] Text color sufficient contrast
- [ ] Column alignment preserved

**Table Rows**
- [ ] Alternating row colors (if used)
- [ ] Hover states visible
- [ ] Row selection visible
- [ ] Data readable

**Pagination Controls**
- [ ] Buttons visible
- [ ] Current page highlighted
- [ ] Navigation works

#### Test Case 4.6: Alert Messages

**Error Alert**
- [ ] Light mode: red tones appropriate
- [ ] Dark mode: red tones visible, not harsh
- [ ] Icon visible
- [ ] Text readable

**Success Alert**
- [ ] Light mode: green tones
- [ ] Dark mode: green tones appropriate
- [ ] Contrast sufficient

**Warning Alert**
- [ ] Light mode: amber/yellow
- [ ] Dark mode: amber/yellow appropriate

**Info Alert**
- [ ] Light mode: blue tones
- [ ] Dark mode: blue tones appropriate

#### Test Case 4.7: Badge & Tag Components

**Badge**
- [ ] Light mode: visible
- [ ] Dark mode: visible
- [ ] Text readable
- [ ] Colors distinguish types

**Status Tag**
- [ ] Success status visible
- [ ] Pending status visible
- [ ] Failed status visible
- [ ] Custom colors work

#### Test Case 4.8: Skeleton Loader

**Loading State**
- [ ] Light mode: subtle gray pulse
- [ ] Dark mode: darker gray pulse
- [ ] Animation smooth
- [ ] Not distracting

---

### 5. Responsive Design Testing

#### Test Case 5.1: Mobile Devices (Portrait)

- [ ] Theme toggle visible
- [ ] Toggle works
- [ ] Text readable
- [ ] Touch targets adequate (≥44x44px)
- [ ] Forms responsive
- [ ] Images scale properly
- [ ] No horizontal scroll

#### Test Case 5.2: Tablet Devices

- [ ] Layout adapts
- [ ] Multi-column layouts work
- [ ] Touch interactions responsive
- [ ] Spacing appropriate

#### Test Case 5.3: Desktop Displays

- [ ] Wide layouts render
- [ ] Sidebar positioning correct
- [ ] Modal positioning correct
- [ ] No unnecessary horizontal scroll

#### Test Case 5.4: Zoom Levels

- [ ] 80% zoom: no text cutoff
- [ ] 100% zoom (normal): perfect
- [ ] 120% zoom: still usable
- [ ] 200% zoom: single column works

---

### 6. Browser Compatibility Testing

#### Test Case 6.1: Chrome/Chromium
- [ ] Dark mode toggle works
- [ ] Colors render correctly
- [ ] localStorage works
- [ ] System preference detected
- [ ] Performance smooth
- [ ] Mobile version works

#### Test Case 6.2: Safari
- [ ] Dark mode toggle works
- [ ] Colors consistent with Chrome
- [ ] localStorage works
- [ ] iOS appearance maintained
- [ ] Touch interactions smooth

#### Test Case 6.3: Firefox
- [ ] Dark mode fully functional
- [ ] Colors match other browsers
- [ ] Form inputs styled correctly
- [ ] Scrollbars styled

#### Test Case 6.4: Edge
- [ ] Dark mode works
- [ ] Color consistency
- [ ] Feature parity with Chrome

#### Test Case 6.5: Mobile Safari (iOS)
- [ ] Toggle button accessible
- [ ] Theme switches smoothly
- [ ] Preference persists
- [ ] System preference detection works
- [ ] Notch/safe area respected

#### Test Case 6.6: Chrome Mobile (Android)
- [ ] Toggle visible and functional
- [ ] Colors appropriate for mobile
- [ ] Performance acceptable
- [ ] LocalStorage working

---

### 7. Performance Testing

#### Test Case 7.1: Theme Switch Speed
- [ ] Toggle to dark mode: < 500ms visible change
- [ ] No layout shift (CLS = 0)
- [ ] No janky scrolling during switch
- [ ] CPU usage low

#### Test Case 7.2: Page Load
- [ ] Light mode page load: normal
- [ ] Dark mode page load: no slower
- [ ] CSS size increase: < 5%
- [ ] JS size increase: < 2%

#### Test Case 7.3: Memory Usage
- [ ] Memory leak check: none detected
- [ ] localStorage impact: < 50 bytes

---

### 8. Accessibility Testing

#### Test Case 8.1: Keyboard Navigation
- [ ] Tab through all elements
- [ ] Focus visible in both modes
- [ ] Focus ring has good contrast
- [ ] Theme toggle reachable by keyboard
- [ ] Theme toggle activatable by Enter/Space

#### Test Case 8.2: Screen Reader
- [ ] Theme toggle labeled: "Toggle dark mode"
- [ ] State announced: "Light mode" / "Dark mode"
- [ ] Form labels associated with inputs
- [ ] Buttons have accessible names
- [ ] Images have alt text

#### Test Case 8.3: Contrast Ratios
- [ ] All text ≥ 4.5:1 (WCAG AAA for body text)
- [ ] UI components ≥ 3:1 (WCAG AA)
- [ ] Use WAVE or WebAIM tool to verify
- [ ] No color-only indicators

#### Test Case 8.4: Focus Management
- [ ] Focus visible on all interactive elements
- [ ] Focus ring color appropriate in both modes
- [ ] Focus not hidden behind other elements
- [ ] Focus returns after closing modals

---

### 9. System Preference Testing

#### Test Case 9.1: Automatic Detection

**Setup: First visit, no localStorage**
- [ ] System set to Light:
  - [ ] App loads in light mode
- [ ] System set to Dark:
  - [ ] App loads in dark mode

#### Test Case 9.2: System Change Detection

**While app running:**
- [ ] Change OS to dark mode:
  - [ ] App updates to dark (if no manual selection)
- [ ] Change OS to light mode:
  - [ ] App updates to light (if no manual selection)

#### Test Case 9.3: User Override

**After manual selection:**
- [ ] User selects dark mode
- [ ] Change OS to light:
  - [ ] App stays in dark mode
- [ ] Refresh page:
  - [ ] Still in dark mode (from localStorage)

#### Test Case 9.4: Clear Data

**After clearing browser data:**
- [ ] Clear localStorage
- [ ] Reload page:
  - [ ] Respects system preference again

---

### 10. Edge Cases

#### Test Case 10.1: Quick Toggles
- [ ] Rapidly toggle 10+ times
- [ ] Last state is always correct
- [ ] No race conditions
- [ ] Memory stable

#### Test Case 10.2: Multiple Tabs
- [ ] Open 2 tabs
- [ ] Toggle in tab 1
- [ ] Tab 2 remains unchanged (expected)
- [ ] Toggle in tab 2
- [ ] Both maintain their state

#### Test Case 10.3: Private/Incognito
- [ ] Open in private mode
- [ ] Toggle works (in-session)
- [ ] Close tab, reopen:
  - [ ] Respects system preference
  - [ ] No stored preference

#### Test Case 10.4: Network Offline
- [ ] Go offline
- [ ] Theme toggle works
- [ ] Preference persists to localStorage
- [ ] When online, no conflicts

#### Test Case 10.5: Reduced Motion
**If browser has "Reduce Motion" preference:**
- [ ] Theme switch instant (no animation)
- [ ] Or very subtle animation
- [ ] Text still readable
- [ ] No jarring changes

---

## 🎨 Color Verification Checklist

### Verify These Color Pairs (Contrast)

| Element | Light Mode | Dark Mode | Light Contrast | Dark Contrast | Status |
|---------|-----------|-----------|-----------------|-----------------|--------|
| Body text | #171717 on #fff | #F1F5F9 on #050E1F | ≥4.5:1 | ≥4.5:1 | ✓ |
| Secondary text | #666 on #fff | #CBD5E1 on #050E1F | ≥4.5:1 | ≥4.5:1 | ✓ |
| Orange accent | #FF6B35 on #fff | #FF6B35 on #050E1F | ≥3:1 | ≥3:1 | ✓ |
| Button text | #fff on #006 | #fff on #0066 | ≥4.5:1 | ≥4.5:1 | ✓ |
| Border | #e5e7eb | #334155 | N/A | N/A | ✓ |
| Input BG | #f3f4f6 | #1E293B | Visual clear | Visual clear | ✓ |

---

## 📋 Test Results Template

```markdown
## Dark Mode Test Results - [DATE]

### Overall Status: [PASS/FAIL]

### Test Environment
- Browser: [Chrome/Safari/Firefox/Edge]
- OS: [Windows/macOS/Linux/iOS/Android]
- Viewport: [1920x1080/390x844/etc]
- Connection: [Online/Offline]

### Test Results

#### Light Mode
- [✓/✗] All elements visible
- [✓/✗] Text readable
- [✓/✗] Contrast adequate

#### Dark Mode
- [✓/✗] All elements visible
- [✓/✗] Text readable
- [✓/✗] Contrast adequate

#### Theme Toggle
- [✓/✗] Toggle button visible
- [✓/✗] Toggle functional
- [✓/✗] Smooth transitions

#### Persistence
- [✓/✗] Theme persists on refresh
- [✓/✗] System preference detected

### Issues Found
1. [If any]

### Notes
[Additional observations]

### Tester
Name: [Your Name]
Date: [Date]
```

---

## 🚀 Running Tests

### Manual Testing
```bash
# Start dev server
npm run dev

# Navigate to pages
http://localhost:3000

# Test each scenario from checklist
```

### Automated Testing (WIP)
```bash
# Run test suite
npm test

# With coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

### Lighthouse Audit
```bash
# Accessibility score should be 90+
# Performance should not be impacted
lighthouse http://localhost:3000
```

---

## ✅ Sign-Off

- [ ] All manual tests passed
- [ ] No browser-specific issues
- [ ] Mobile testing completed
- [ ] Accessibility verified
- [ ] Performance acceptable
- [ ] Ready for production

**Tested By**: _______________
**Date**: _______________
**Browser/Device Coverage**: _______________

---

**Last Updated**: February 16, 2026
**Test Plan Version**: 1.0.0
