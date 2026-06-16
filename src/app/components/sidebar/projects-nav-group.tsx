/**
 * ProjectsNavGroup — global "Projects" dropdown.
 *
 * Children:
 *   • Portfolio                       → /app/projects
 *   • GC ▼
 *       Prime Change Orders           → /app/project/{projectId}/prime-change-orders
 *   • Vendor ▼
 *       RFQs                          → /app/project/{projectId}/rfqs
 *       Purchase Orders               → …/purchase-orders
 *       Sub Change Order              → …/sub-change-order
 *       Invoices                      → …/invoices
 *
 * The GC / Vendor sub-items resolve their `{projectId}` from the active URL
 * (when the user is inside a specific project) or fall back to the first
 * project in the list so the link is always clickable.
 */
import { useLocation, useNavigate } from 'react-router-dom';

import {
  AccordionMenu,
  AccordionMenuIndicator,
  AccordionMenuLinkItem,
  AccordionMenuSub,
  AccordionMenuSubContent,
  AccordionMenuSubTrigger,
} from '@/app/components/ui/accordion-menu';
import { useProjectsQuery } from '@/modules/project/hooks';

export function ProjectsNavGroup() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const { data } = useProjectsQuery({ size: 100, sortBy: 'createdAt', sortOrder: 'desc' });
  const projects = data?.data ?? [];
  const activeProjectId = pathname.match(/\/project\/([^/]+)/)?.[1];
  const fallbackProjectId = projects[0]?.id;
  const targetProjectId = activeProjectId ?? fallbackProjectId;
  const projectBase = targetProjectId ? `/app/project/${targetProjectId}` : '/app/projects';

  const portfolioPath = '/app/projects';
  const isOnPortfolio = pathname === portfolioPath;
  const isInsideAnyProject = pathname.startsWith('/app/project/');

  // Note: no `data-[selected=true]:bg-white/10` — keep the resting look
  // consistent with the sibling dropdown triggers (GC / Vendor) so nothing
  // sits inside a highlighted rectangle when active.
  const itemClasses =
    'h-8 px-2.5 text-sm font-normal text-foreground hover:!bg-white/10 hover:!text-[#c75e40] data-[selected=true]:!text-[#c75e40] [&[data-selected=true]_svg]:opacity-100';

  const triggerClasses =
    'h-8 px-2.5 text-sm font-normal text-foreground hover:!bg-white/10 hover:!text-[#c75e40]';

  const renderLink = (label: string, to: string) => (
    <AccordionMenuLinkItem
      value={to}
      asChild
      onClick={(event) => {
        event.preventDefault();
        navigate(to);
      }}
    >
      <a href={to}>
        <span>{label}</span>
      </a>
    </AccordionMenuLinkItem>
  );

  return (
    <AccordionMenu
      // Reset to closed on every page navigation.
      key={pathname}
      selectedValue={undefined}
      matchPath={(href) => pathname === href}
      type="single"
      collapsible
      className="space-y-5 px-2.5"
      classNames={{ item: itemClasses, subTrigger: triggerClasses, subContent: 'ps-0' }}
    >
      <AccordionMenuSub value="projects">
        <AccordionMenuSubTrigger
          value="projects-trigger"
          onClick={() => {
            // Click on "Projects" expands AND navigates to the Portfolio.
            if (!isOnPortfolio && !isInsideAnyProject) navigate(portfolioPath);
          }}
        >
          <span>Projects</span>
          <AccordionMenuIndicator />
        </AccordionMenuSubTrigger>

        <AccordionMenuSubContent type="single" collapsible parentValue="projects-trigger">
          {/* Portfolio */}
          {renderLink('Portfolio', portfolioPath)}

          {/* GC = single flat link to Prime Change Orders (no dropdown) */}
          {renderLink('GC Prime Change Order', `${projectBase}/prime-change-orders`)}

          {/* Vendor ▼ → RFQs / POs / SCO / Invoices */}
          <AccordionMenuSub value="projects-vendor">
            <AccordionMenuSubTrigger value="projects-vendor-trigger">
              <span>Vendor</span>
              <AccordionMenuIndicator />
            </AccordionMenuSubTrigger>
            <AccordionMenuSubContent
              type="single"
              collapsible
              parentValue="projects-vendor-trigger"
            >
              {renderLink('RFQs', `${projectBase}/rfqs`)}
              {renderLink('Purchase Orders', `${projectBase}/purchase-orders`)}
              {renderLink('Sub Change Order', `${projectBase}/sub-change-order`)}
              {renderLink('Invoices', `${projectBase}/invoices`)}
            </AccordionMenuSubContent>
          </AccordionMenuSub>
        </AccordionMenuSubContent>
      </AccordionMenuSub>
    </AccordionMenu>
  );
}
