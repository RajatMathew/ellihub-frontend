import { Fragment } from 'react/jsx-runtime';

import type { MenuConfig } from '@app/config/types';

const SidebarCustomMenu = ({ menu }: { menu?: MenuConfig }) => {
  return (
    <div className="flex flex-col">
      {menu?.map((item, index) =>
        item.render ? <Fragment key={index}>{item.render()}</Fragment> : null
      )}
    </div>
  );
};

export default SidebarCustomMenu;
