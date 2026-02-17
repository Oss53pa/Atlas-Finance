import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}

export const IoCloseCircleSharp: React.FC<IconProps> = ({
  className = '',
  size = 24,
  color = 'currentColor',
  style = {}
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 512 512"
    fill={color}
    className={className}
    style={{ cursor: 'pointer', ...style }}
  >
    <path d="M256 48C141.31 48 48 141.31 48 256s93.31 208 208 208 208-93.31 208-208S370.69 48 256 48zm75.31 260.69a16 16 0 11-22.62 22.62L256 278.63l-52.69 52.68a16 16 0 01-22.62-22.62L233.37 256l-52.68-52.69a16 16 0 0122.62-22.62L256 233.37l52.69-52.68a16 16 0 0122.62 22.62L278.63 256z"/>
  </svg>
);

export const BsThreeDotsVertical: React.FC<IconProps> = ({
  className = '',
  size = 16,
  color = 'currentColor'
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill={color}
    className={className}
  >
    <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
  </svg>
);

export const RiRefund2Line: React.FC<IconProps> = ({
  className = '',
  size = 24,
  color = 'currentColor'
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 2L2 12l10 10 10-10L12 2z"/>
    <path d="M8 12h8"/>
    <path d="M12 8v8"/>
  </svg>
);

export const FaLock: React.FC<IconProps> = ({
  className = '',
  size = 16,
  color = 'green'
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 448 512"
    fill={color}
    className={className}
  >
    <path d="M80 192V144C80 64.47 144.5 0 224 0s144 64.47 144 144v48h16c26.5 0 48 21.5 48 48v224c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V240c0-26.5 21.5-48 48-48h32zm32 0h192V144c0-52.93-43.1-96-96-96s-96 43.07-96 96v48z"/>
  </svg>
);

export const FaLockOpen: React.FC<IconProps> = ({
  className = '',
  size = 16,
  color = 'purple'
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 576 512"
    fill={color}
    className={className}
  >
    <path d="M423.5 0C339.5.3 272 69.5 272 153.5V192H48c-26.5 0-48 21.5-48 48v224c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V240c0-26.5-21.5-48-48-48h-48V153.5C352 69.5 407.5 16 423.5 16c42.4 0 86.2 33.4 86.2 33.4l22.3-22.2C532 27.2 475.4 0 423.5 0zM336 192H112V153.5c0-41.9 33.8-75.5 75.5-75.5S263 111.6 263 153.5V192h73z"/>
  </svg>
);

export const IoIosAddCircleOutline: React.FC<IconProps> = ({
  className = '',
  size = 24,
  color = 'currentColor'
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 512 512"
    fill="none"
    stroke={color}
    strokeWidth="32"
    className={className}
  >
    <circle cx="256" cy="256" r="192"/>
    <line x1="256" y1="176" x2="256" y2="336"/>
    <line x1="176" y1="256" x2="336" y2="256"/>
  </svg>
);

export const RiCloseCircleLine: React.FC<IconProps> = ({
  className = '',
  size = 24,
  color = 'currentColor'
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10"/>
    <line x1="15" y1="9" x2="9" y2="15"/>
    <line x1="9" y1="9" x2="15" y2="15"/>
  </svg>
);

export const FaEdit: React.FC<IconProps> = ({
  className = '',
  size = 16,
  color = 'currentColor'
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 512 512"
    fill={color}
    className={className}
  >
    <path d="M471.6 21.7c-21.9-21.9-57.3-21.9-79.2 0L362.3 51.7l97.9 97.9 30.1-30.1c21.9-21.9 21.9-57.3 0-79.2L471.6 21.7zm-299.2 220c-6.1 6.1-10.8 13.6-13.5 21.9l-29.6 88.8c-2.9 8.6-.6 18.1 5.8 24.6s15.9 8.7 24.6 5.8l88.8-29.6c8.2-2.7 15.7-7.4 21.9-13.5L437.7 172.3 339.7 74.3 172.4 241.7zM96 64C43 64 0 107 0 160V416c0 53 43 96 96 96H352c53 0 96-43 96-96V320c0-17.7-14.3-32-32-32s-32 14.3-32 32v96c0 17.7-14.3 32-32 32H96c-17.7 0-32-14.3-32-32V160c0-17.7 14.3-32 32-32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32H96z"/>
  </svg>
);

export const TbSquareMinusFilled: React.FC<IconProps> = ({
  className = '',
  size = 20,
  color = 'currentColor'
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
    className={className}
  >
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 9H7v-2h10v2z"/>
  </svg>
);

export const BsPlusSquareFill: React.FC<IconProps> = ({
  className = '',
  size = 20,
  color = 'currentColor'
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill={color}
    className={className}
  >
    <path d="M2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2zm6.5 4.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3a.5.5 0 0 1 1 0z"/>
  </svg>
);