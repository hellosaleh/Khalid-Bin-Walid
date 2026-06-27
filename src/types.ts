export type CanvasSizePreset = 'square' | 'vertical' | 'custom';

export interface CanvasDimensions {
  w: number;
  h: number;
}

export interface ImageItem {
  url: string;
  name: string;
}

export interface PresetItem {
  name: string;
  settings: Partial<AppSettings>;
}

export interface DragPosition {
  x: number;
  y: number;
  zoom: number;
}

export type HighlightStyle = 'text' | 'box';
export type AlignHorizontal = 'left' | 'center' | 'right';
export type AlignVertical = 'top' | 'middle' | 'bottom';
export type CtaShape = 'pill' | 'sharp' | 'soft' | 'angled' | 'arrow' | 'ribbon' | 'hexagon' | 'notch';

export interface AppSettings {
  sizePreset: CanvasSizePreset;
  customWidth: number;
  customHeight: number;
  
  bgTab: 'solid' | 'gradient' | 'image';
  bgColor: string;
  gradC1: string;
  gradC2: string;
  gradAngle: number;
  
  images: ImageItem[];
  selectedImageIndex?: number;
  imgFit: 'cover' | 'contain';
  overlayEnabled: boolean;
  overlayColor: string;
  overlayOpacity: number;
  
  // Zoom & Position for background image
  bgZoom: number;
  bgPosX: number;
  bgPosY: number;
  
  // Subheadline
  subEnabled: boolean;
  subText: string;
  subSize: number;
  subColor: string;
  subY: number; // Y position percentage (0 to 100)
  
  // Main typography
  adCopies: string[];
  fontFamily: string;
  fontWeight: string;
  fontSize: number;
  lineHeight: number;
  textColor: string;
  highlightColor: string;
  highlightStyle: HighlightStyle;
  hAlign: AlignHorizontal;
  vAlign: AlignVertical;
  
  // Description Text
  descEnabled: boolean;
  descText: string;
  descSize: number;
  descColor: string;
  descWeight: string;
  descY: number;
  descHAlign: AlignHorizontal;
  descBoxEnabled: boolean;
  descBoxColor: string;
  descBoxOpacity: number;
  descBoxPadding: number;
  descBorderWidth: number;
  descBorderColor: string;
  
  // CTA Button
  ctaEnabled: boolean;
  ctaText: string;
  ctaShape: CtaShape;
  ctaY: number;
  ctaWeight: string;
  ctaRadius: number;
  ctaPx: number;
  ctaPy: number;
  ctaSize: number;
  ctaTextColor: string;
  ctaBgColor: string;
  ctaTransparent: boolean;
  ctaUnderline: boolean;
  
  // Flag / Logo
  flagEnabled: boolean;
  flagCountryCode: string;
  flagCountryName: string;
  flagSize: number;
  flagY: number;
  flagHAlign: AlignHorizontal;
  
  // Text Effects
  outlineEnabled: boolean;
  outlineWidth: number;
  outlineColor: string;
  shadowEnabled: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOx: number;
  shadowOy: number;
}
