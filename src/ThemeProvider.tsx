import '@mantine/core/styles.css';
import '/src/styles/globalStyles.css'
import { MantineProvider, createTheme, rem } from '@mantine/core';

const theme = createTheme({
  colors: {
    'background': ['#222222', '#212121', '#2c2c2c', '#383838', '#444444', '#505050', '#5b5b5b', '#676767', '#737373', '#7e7e7e'],
    'text': ['#E0E2DB','#8F8F8F','#e6cb97','#d9bf8f','#ccb486','#bfa97e','#b39e76','#a6926d','#998765','#8c7c5c'],
    'primary': ['#333333','#333333','#3D3D3D','#292929','#1F1F1F','#42967a','#3e8e72','#3b856b','#4eb18f','#377c64']
  },
  fontSizes: {
    xs: rem(12),
    sm: rem(16),
    md: rem(20),
    lg: rem(24),
    xl: rem(28),
  },
  fontFamily: 'RobotoMono',
});

/*
globalStyles: () => ({
    body: {
      backgroundColor: styleColors.background.solid,
      color: styleColors.text,
      scrollbarWidth: "none",
      msOverflowStyle: "none",
      "&::-webkit-scrollbar": {
        display: "none"
      }
    },
    style: {
      '@font-face': {
        fontFamily: 'Roboto Mono',
        src: `url(${roboto}) format('truetype')`,
      },
    }
  }),
  fontFamily: 'Roboto Mono'
*/

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {

  return (
    <MantineProvider defaultColorScheme="dark" theme={theme}>
      {children}
    </MantineProvider>
  );
}