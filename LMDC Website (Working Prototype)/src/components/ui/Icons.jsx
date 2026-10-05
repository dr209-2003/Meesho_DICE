const base = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.1, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
const I = (paths) => function Icon(props) {
  return <svg {...base} {...props}>{paths}</svg>;
};

export const IconBox = I(<><path d="M3 7l9-4 9 4-9 4-9-4z" /><path d="M3 7v10l9 4 9-4V7" /><path d="M12 11v10" /></>);
export const IconTruck = I(<><path d="M2 6h11v9H2zM13 9h4l3 3v3h-7" /><circle cx="6" cy="17" r="2" /><circle cx="17" cy="17" r="2" /></>);
export const IconCheck = I(<><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></>);
export const IconX = I(<><circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M15 9l-6 6" /></>);
export const IconLoop = I(<><path d="M4 12a8 8 0 0114-5l2 2M20 12a8 8 0 01-14 5l-2-2" /><path d="M20 4v5h-5M4 20v-5h5" /></>);
export const IconBell = I(<><path d="M6 9a6 6 0 1112 0c0 6 2 7 2 7H4s2-1 2-7" /><path d="M10 20a2 2 0 004 0" /></>);
export const IconList = I(<><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>);
export const IconMenu = I(<path d="M4 6h16M4 12h16M4 18h16" />);
export const IconSearch = I(<><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>);
export const IconCal = I(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>);
export const IconStore = I(<path d="M3 9l1.5-5h15L21 9M3 9h18v11H3zM9 20v-6h6v6" />);
export const IconUser = I(<><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></>);
export const IconShelf = I(<><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18M9 3v18" /></>);
export const IconDownload = I(<><path d="M12 4v11M7 10l5 5 5-5" /><path d="M4 20h16" /></>);
export const IconArrow = I(<path d="M5 12h14M13 6l6 6-6 6" />);
