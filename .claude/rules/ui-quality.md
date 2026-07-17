---
alwaysApply: true
---

# UI Quality — Avoid the AI Aesthetic

AI-generated UI has recognizable patterns that make apps look generic. Avoid all of them:

| AI Default                                        | Why It's a Problem                                 | Do This Instead                                                                     |
| ------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Purple/indigo everything                          | Makes every AI-built app look identical            | Use the project's actual color palette from `src/index.css`                         |
| Excessive gradients                               | Adds visual noise, clashes with the design system  | Flat colors or subtle gradients only if the design system uses them                 |
| Rounded everything (`rounded-2xl`, `rounded-3xl`) | Ignores corner radius hierarchy                    | Use the design system's `--radius` scale (`rounded-sm`, `rounded-md`, `rounded-lg`) |
| Generic hero sections                             | Template-driven layout disconnected from content   | Content-first layouts driven by real user needs                                     |
| Lorem ipsum-style copy                            | Hides layout problems (length, wrapping, overflow) | Use realistic placeholder content that matches expected data                        |
| Oversized padding everywhere                      | Destroys visual hierarchy, wastes space            | Follow the project's spacing scale consistently                                     |
| Stock card grids                                  | Ignores information priority and scanning patterns | Purpose-driven layouts — cards only when content warrants them                      |
| Shadow-heavy design                               | Competes with content, hurts performance           | Subtle or no shadows unless the design system specifies them                        |

## Red Flags — Do Not Ship These

- **Components over 200 lines** — split them into smaller, focused components.
- **Inline styles or arbitrary pixel values** (`style={{}}`, `w-[347px]`) — use Tailwind utilities and the design system's spacing scale.
- **Missing UI states** — every data-driven component must handle: loading, error, empty, and success states.
- **No keyboard navigation** — all interactive elements must be reachable and operable via keyboard.
- **Color as the sole state indicator** — never rely only on red/green. Always pair color with text labels, icons, or patterns for accessibility.
- **Generic "AI look"** — if it looks like a purple-gradient, oversized-card demo, rethink it. Match the existing design language.
