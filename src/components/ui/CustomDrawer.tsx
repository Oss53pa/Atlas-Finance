import React from 'react';

interface CustomCardDrawerProps {
  title: string;
  className?: string;
  active: boolean;
  drawer: boolean;
  children: React.ReactNode;
}

export const CustomCardDrawer: React.FC<CustomCardDrawerProps> = ({
  title,
  className = '',
  active,
  drawer,
  children
}) => {
  if (!drawer || !active) return null;

  return (
    <div className={`card mt-3 ${className}`}>
      <div className="card-header">
        <h5 className="card-title mb-0">{title}</h5>
      </div>
      <div className="card-body">
        {children}
      </div>
    </div>
  );
};

interface DrawerItem {
  id: string;
  title: string;
  icon?: string;
  action?: string;
}

interface CustomSideBarDrawerProps {
  items: DrawerItem[];
  setOpenModalAdd: () => void;
  setContentDrawerActive: (content: Record<string, unknown>) => void;
  drawer: boolean;
  setDrawer: (open: boolean) => void;
}

export const CustomSideBarDrawer: React.FC<CustomSideBarDrawerProps> = ({
  items,
  setOpenModalAdd,
  setContentDrawerActive,
  drawer,
  setDrawer
}) => {
  return (
    <div className={`sidebar-drawer ${drawer ? 'open' : ''}`}>
      <div className="drawer-header">
        <h6>Menu Actions</h6>
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={() => setDrawer(!drawer)}
        >
          {drawer ? 'Fermer' : 'Menu'}
        </button>
      </div>
      <div className="drawer-content">
        <button
          className="btn btn-primary w-100 mb-2"
          onClick={setOpenModalAdd}
        >
          + Nouvel Appel de Fonds
        </button>
        {items.map((item) => (
          <button
            key={item.id}
            className="btn btn-outline-secondary w-100 mb-1"
            onClick={() => setContentDrawerActive(item)}
          >
            {item.title}
          </button>
        ))}
      </div>
    </div>
  );
};