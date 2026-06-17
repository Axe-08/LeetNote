import React from 'react';

interface IconProps {
  className?: string;
  width?: number;
  height?: number;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const IconBack: React.FC<IconProps> = ({ className = 'ic', width = 14, height = 14, onClick, style }) => (
  <span className={className} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default', ...style }}>
    <svg width={width} height={height} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="13.5" y1="8" x2="2.5" y2="8" />
      <polyline points="6.5,4 2.5,8 6.5,12" />
    </svg>
  </span>
);

export const IconClose: React.FC<IconProps> = ({ className = 'ic', width = 13, height = 13, onClick, style }) => (
  <span className={className} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default', ...style }}>
    <svg width={width} height={height} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="4" x2="12" y2="12" />
      <line x1="12" y1="4" x2="4" y2="12" />
    </svg>
  </span>
);

export const IconNote: React.FC<IconProps> = ({ className = 'ic', width = 12, height = 12, style }) => (
  <span className={className} style={style}>
    <svg width={width} height={height} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11.5 2.5l2 2-7 7H4.5v-2z" />
      <path d="M10 4l2 2" />
    </svg>
  </span>
);

export const IconCode: React.FC<IconProps> = ({ className = 'ic', width = 12, height = 12, style }) => (
  <span className={className} style={style}>
    <svg width={width} height={height} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="5,4 1.5,8 5,12" />
      <polyline points="11,4 14.5,8 11,12" />
    </svg>
  </span>
);

export const IconClock: React.FC<IconProps> = ({ className = 'ic', width = 12, height = 12, style }) => (
  <span className={className} style={style}>
    <svg width={width} height={height} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="8" r="5.5" />
      <polyline points="8,5 8,8.5 10.5,10.5" strokeLinejoin="round" />
    </svg>
  </span>
);

export const IconStar: React.FC<IconProps> = ({ className = 'ic', width = 12, height = 12, style }) => (
  <span className={className} style={style}>
    <svg width={width} height={height} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="8,1.5 9.9,6.1 15,6.5 11.2,10 12.5,15 8,12.3 3.5,15 4.8,10 1,6.5 6.1,6.1" />
    </svg>
  </span>
);

export const IconClip: React.FC<IconProps> = ({ className = 'ic', width = 12, height = 12, style }) => (
  <span className={className} style={style}>
    <svg width={width} height={height} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M13.5 8l-5 5a3.5 3.5 0 0 1-5-5l5.5-5.5a2 2 0 0 1 2.8 2.8L6.5 10.5a.7.7 0 0 1-1-1L11 4" />
    </svg>
  </span>
);

export const IconSave: React.FC<IconProps> = ({ className = 'ic', width = 14, height = 14, style }) => (
  <span className={className} style={style}>
    <svg width={width} height={height} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 13V3a1 1 0 0 1 1-1h7.5L14 5.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" />
      <path d="M10 2v4H5V2" />
      <path d="M4 9h8" />
    </svg>
  </span>
);

export const IconRetry: React.FC<IconProps> = ({ className = 'ic', width = 14, height = 14, style }) => (
  <span className={className} style={style}>
    <svg width={width} height={height} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 8a5.5 5.5 0 1 1 1 3.2" />
      <polyline points="2.5,5 2.5,9 6.5,9" />
    </svg>
  </span>
);

export const IconCheck: React.FC<IconProps> = ({ className = 'ic', width = 14, height = 14, style }) => (
  <span className={className} style={style}>
    <svg width={width} height={height} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2,8 6,12 14,4" />
    </svg>
  </span>
);

export const IconLayers: React.FC<IconProps> = ({ className = 'ic', width = 13, height = 13, style }) => (
  <span className={className} style={style}>
    <svg width={width} height={height} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="8,1.5 14,5 8,8.5 2,5" />
      <polyline points="2,9 8,12.5 14,9" />
    </svg>
  </span>
);

export const IconChevronR: React.FC<IconProps> = ({ className = 'ic', width = 11, height = 11, style }) => (
  <span className={className} style={style}>
    <svg width={width} height={height} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6,4 10,8 6,12" />
    </svg>
  </span>
);

export const IconNotion: React.FC<IconProps> = ({ className = 'ic', width = 16, height = 16, style }) => (
  <span className={className} style={style}>
    <svg width={width} height={height} viewBox="0 0 16 16" fill="currentColor">
      <rect x="2" y="1" width="12" height="14" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <line x1="5" y1="5" x2="11" y2="5" stroke="currentColor" stroke-width="1.2" />
      <line x1="5" y1="8" x2="11" y2="8" stroke="currentColor" stroke-width="1.2" />
      <line x1="5" y1="11" x2="8" y2="11" stroke="currentColor" stroke-width="1.2" />
    </svg>
  </span>
);

export const IconQueue: React.FC<IconProps> = ({ className = 'ic', width = 14, height = 14, style }) => (
  <span className={className} style={style}>
    <svg width={width} height={height} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="2" y="3" width="12" height="10" rx="0" />
      <line x1="5" y1="7" x2="11" y2="7" />
      <line x1="5" y1="10" x2="9" y2="10" />
      <line x1="2" y1="3" x2="14" y2="3" />
    </svg>
  </span>
);
