// src/theme/colors.ts

export const HSL_COLORS = {
  light: {
    background: 'hsl(210, 20%, 98%)', // soft gray-blue
    card: 'hsl(0, 0%, 100%)',
    text: 'hsl(222, 47%, 11%)',
    textMuted: 'hsl(215.4, 16.3%, 46.9%)',
    primary: 'hsl(142.1, 76.2%, 36.3%)', // premium emerald
    primaryForeground: 'hsl(355.7, 100%, 97.3%)',
    border: 'hsl(214.3, 31.8%, 91.4%)',
    pending: 'hsl(35, 92%, 50%)', // warm amber for pending tickets
    closed: 'hsl(215, 16%, 47%)', // slate for resolved tickets
    internal: 'hsl(48, 96%, 89%)', // soft yellow for internal notes
    internalBorder: 'hsl(48, 96%, 50%)',
    tagBackground: 'hsl(226, 70%, 95%)',
    tagText: 'hsl(226, 70%, 40%)',
  },
  dark: {
    background: 'hsl(222.2, 84%, 4.9%)', // deep dark
    card: 'hsl(222.2, 84%, 8.3%)',
    text: 'hsl(210, 40%, 98%)',
    textMuted: 'hsl(215, 20.2%, 65.1%)',
    primary: 'hsl(142.1, 70.6%, 45.3%)', // vibrant emerald
    primaryForeground: 'hsl(144.9, 80.4%, 10%)',
    border: 'hsl(217.2, 32.6%, 17.5%)',
    pending: 'hsl(35, 92%, 60%)',
    closed: 'hsl(215, 20.2%, 65.1%)',
    internal: 'hsl(48, 40%, 15%)',
    internalBorder: 'hsl(48, 96%, 40%)',
    tagBackground: 'hsl(226, 30%, 15%)',
    tagText: 'hsl(226, 70%, 80%)',
  }
};

export const colors = {
  light: {
    background: '#F4F6F8',
    card: '#FFFFFF',
    text: '#0F172A',
    textMuted: '#64748B',
    primary: '#10B981', // emerald-500
    primaryLight: '#E6F4EA',
    border: '#E2E8F0',
    pending: '#F59E0B', // amber-500
    closed: '#64748B',
    internal: '#FFF9C4', // light yellow
    internalText: '#855D00',
    tagBg: '#EEF2FF',
    tagText: '#4F46E5',
    bubbleSelf: '#DCF8C6',
    bubbleOther: '#FFFFFF',
    inputBg: '#FFFFFF',
    shadow: '#0F172A10',
  },
  dark: {
    background: '#090D16',
    card: '#121824',
    text: '#F8FAFC',
    textMuted: '#94A3B8',
    primary: '#10B981',
    primaryLight: '#064E3B',
    border: '#1E293B',
    pending: '#F59E0B',
    closed: '#475569',
    internal: '#2D2812',
    internalText: '#FBBF24',
    tagBg: '#1E1B4B',
    tagText: '#818CF8',
    bubbleSelf: '#054C3C',
    bubbleOther: '#1E293B',
    inputBg: '#121824',
    shadow: '#00000030',
  }
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const typography = {
  fontSizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
  },
};
