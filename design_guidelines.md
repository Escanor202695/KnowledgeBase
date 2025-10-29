# Design Guidelines: Second Brain AI Knowledge Base

## Design Approach

**Selected System**: Tailwind CSS + shadcn/ui Design System with Linear/Notion influences
**Rationale**: This is a utility-focused productivity application requiring clean, efficient patterns optimized for information density and frequent use. The design prioritizes clarity, speed, and cognitive ease over visual flair.

**Core Principles**:
- **Information Hierarchy**: Clear visual distinction between different content types (videos, chat, sources)
- **Efficient Scanning**: Grid layouts and consistent spacing for quick navigation
- **Focus Mode**: Minimal distractions during chat interactions
- **Semantic Clarity**: Every UI element has obvious purpose and affordance

---

## Typography System

**Font Stack**: 
- Primary: `font-sans` (Inter via Tailwind default)
- Monospace: `font-mono` for video IDs, timestamps

**Hierarchy**:
- **Page Titles**: `text-2xl font-semibold` (Main sections like "Your Knowledge Base")
- **Section Headers**: `text-lg font-medium` (Video titles, chat headers)
- **Body Text**: `text-sm` (Chat messages, video descriptions, form inputs)
- **Supporting Text**: `text-xs font-medium` (Timestamps, metadata, labels)
- **Code/Technical**: `text-xs font-mono` (Video IDs, technical details)

**Line Heights**:
- Headings: `leading-tight`
- Body text: `leading-relaxed` for readability in chat
- Dense info: `leading-normal` for video cards

---

## Layout System

**Spacing Primitives**: Use Tailwind units of **2, 4, 6, 8, 12, 16** consistently throughout
- Micro spacing: `p-2`, `gap-2` (tight groups)
- Standard spacing: `p-4`, `gap-4`, `space-y-4` (component internals)
- Section spacing: `p-6`, `gap-6` (between major sections)
- Large breathing room: `p-8`, `py-12` (page padding, modal padding)

**Container Strategy**:
- Main app container: `max-w-7xl mx-auto px-4 lg:px-8`
- Chat container: `max-w-4xl mx-auto` (optimal reading width)
- Video grid: `max-w-7xl` (allows 3-4 column layouts)
- Full-width sections: `w-full` for header/navigation

**Grid Patterns**:
- Video library: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
- Source citations: `grid grid-cols-1 gap-2` (stacked, not side-by-side)
- Metadata displays: `flex gap-2` (inline, compact)

---

## Page Layout Structure

### Main Application Layout
```
┌─────────────────────────────────────────┐
│ Header (sticky top)                     │ h-16, border-b
│ Logo + Navigation + Action Button       │
├─────────────────────────────────────────┤
│                                         │
│  Two-Column Split (lg:) or Stack (md:)  │
│                                         │
│  ┌──────────────┬──────────────────┐   │
│  │ Left Panel   │ Right Panel      │   │
│  │ Video Input  │ Chat Interface   │   │
│  │ + Library    │                  │   │
│  │ (40% width)  │ (60% width)      │   │
│  │              │                  │   │
│  │ p-6          │ p-6              │   │
│  └──────────────┴──────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

**Responsive Behavior**:
- **Desktop (lg:)**: Side-by-side panels with border separator
- **Tablet/Mobile**: Stack panels vertically, full width each

---

## Component Library

### 1. Header/Navigation
- **Structure**: Horizontal flex layout with space-between
- **Height**: `h-16` fixed
- **Content**: Logo (text-lg font-semibold) + navigation links (text-sm) + CTA button
- **Border**: Bottom border for separation
- **Sticky**: `sticky top-0 z-50` to remain visible during scroll

### 2. Video Input Section
- **Container**: Card component with `p-6`
- **Input Field**: 
  - Label: `text-sm font-medium mb-2`
  - Input: `h-10 px-4 rounded-md border text-sm`
  - Placeholder: "Paste YouTube URL here..."
- **Submit Button**: `h-10 px-6 rounded-md font-medium` (primary action style)
- **Validation**: Inline error text below input `text-xs mt-1`

### 3. Video Library Grid
- **Grid**: `grid-cols-1 md:grid-cols-2 gap-4`
- **Video Card**:
  - Thumbnail: 16:9 aspect ratio, `rounded-lg overflow-hidden`
  - Thumbnail height: `h-32 md:h-40` 
  - Content padding: `p-4`
  - Title: `text-sm font-medium line-clamp-2`
  - Metadata row: `flex items-center gap-2 text-xs mt-2`
  - Channel name, duration in metadata
  - Hover state: subtle scale transform `hover:scale-[1.02]`

### 4. Chat Interface
- **Message Container**: `space-y-4` for vertical spacing between messages
- **User Message**:
  - Alignment: `flex justify-end`
  - Bubble: `max-w-[80%] rounded-lg px-4 py-3`
  - Text: `text-sm leading-relaxed`
- **AI Message**:
  - Alignment: `flex justify-start`
  - Bubble: `max-w-[85%] rounded-lg px-4 py-3`
  - Text: `text-sm leading-relaxed`
- **Input Area**:
  - Position: Sticky bottom or fixed bottom
  - Layout: Flex with textarea + send button
  - Textarea: `min-h-[60px] max-h-[120px] resize-none p-3 rounded-lg`
  - Send button: Icon button `h-10 w-10 rounded-lg`

### 5. Source Citations
- **Container**: `space-y-2` below AI message
- **Citation Card**:
  - Border: Left accent border `border-l-2`
  - Padding: `pl-4 py-2`
  - Layout: `flex items-start gap-3`
  - Thumbnail: Small `w-16 h-9` (16:9 ratio) with rounded corners
  - Content: `flex-1`
  - Video title: `text-sm font-medium line-clamp-1`
  - Timestamp link: `text-xs underline` with play icon
  - Preview text: `text-xs mt-1 line-clamp-2 opacity-80`

### 6. Empty States
- **Container**: Centered with `flex flex-col items-center justify-center py-12`
- **Icon**: Large icon from library `w-12 h-12 opacity-40`
- **Title**: `text-lg font-medium mt-4`
- **Description**: `text-sm opacity-60 text-center max-w-sm mt-2`
- **Action**: Button below description `mt-6`

### 7. Loading States
- **Skeleton Cards**: Use `animate-pulse` with rounded rectangles
- **Spinner**: Small spinner icon `w-4 h-4 animate-spin` for inline loading
- **Message Loading**: Three dots animation or pulsing indicator

### 8. Toast Notifications
- **Position**: Fixed bottom-right or top-right
- **Size**: `max-w-sm p-4 rounded-lg`
- **Layout**: Flex with icon + message + close button
- **Auto-dismiss**: 3-5 seconds
- **Types**: Success, Error, Info (distinguished by icon and accent)

---

## Icon System

**Library**: Lucide React (via shadcn/ui)
**Common Icons**:
- Video: Video, Youtube icons
- Chat: MessageSquare, Send
- Actions: Plus, Trash2, ExternalLink, Play
- Status: CheckCircle, AlertCircle, Loader2 (for loading)
- Navigation: Menu, X, Search

**Icon Sizing**:
- Buttons: `w-4 h-4` or `w-5 h-5`
- Empty states: `w-12 h-12`
- Inline text: `w-3 h-3`

---

## Form Design Patterns

**Input Fields**:
- All inputs: `h-10 px-3 rounded-md border text-sm`
- Focus state: Ring effect `focus:ring-2 focus:ring-offset-2`
- Error state: Red border with error message below

**Buttons**:
- Primary: `h-10 px-6 rounded-md font-medium` (call-to-action)
- Secondary: Same height, different visual treatment
- Icon-only: `h-10 w-10 rounded-md` (square, centered icon)
- Disabled: Reduced opacity `opacity-50 cursor-not-allowed`

**Labels**:
- Position: Above input with `mb-2`
- Style: `text-sm font-medium`
- Required indicator: Red asterisk `text-red-500`

---

## Interaction Patterns

**Hover States**: Subtle, use `hover:opacity-80` or `hover:scale-[1.02]` for cards
**Active States**: Slight scale down `active:scale-[0.98]` for buttons
**Focus States**: Always show focus ring for accessibility
**Transitions**: Use `transition-all duration-200` for smooth state changes
**Click Feedback**: Immediate visual response (scale, opacity change)

---

## Accessibility Standards

- All interactive elements have minimum 44x44px touch targets
- Form inputs have associated labels with proper `htmlFor` attributes
- Focus states are always visible (no `outline-none` without replacement)
- Color is never the only indicator (use icons + text)
- Alt text for all images (video thumbnails, etc.)
- Semantic HTML: `<nav>`, `<main>`, `<article>` tags
- ARIA labels for icon-only buttons

---

## Image Strategy

**Video Thumbnails**: 
- Source: YouTube thumbnail API (`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`)
- Aspect ratio: 16:9 enforced
- Loading: Use placeholder with skeleton animation
- Error fallback: Generic video placeholder icon

**Empty State Illustrations**: Not required - use large icons from Lucide instead for consistency

**No Hero Image**: This is a utility application - jump straight into functionality