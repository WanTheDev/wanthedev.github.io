import '@mantine/core/styles.css';
import { MantineProvider, createTheme, rem } from '@mantine/core';
//import roboto from './assets/fonts/RobotoMono-Medium.ttf';

const theme = createTheme({
  colors: {
    'background': ['#151515', '#212121', '#2c2c2c', '#383838', '#444444', '#505050', '#5b5b5b', '#676767', '#737373', '#7e7e7e'],
    'text': ['#ffe1a8','#f2d6a0','#e6cb97','#d9bf8f','#ccb486','#bfa97e','#b39e76','#a6926d','#998765','#8c7c5c'],
    'primary': ['#64a671','#5f9e6b','#5a9566','#558d60','#50855a','#4b7d55','#46744f','#416c49','#3c6444','#375b3e']
  },
  fontSizes: {
    xs: rem(12),
    sm: rem(16),
    md: rem(20),
    lg: rem(24),
    xl: rem(28),
  },
  //fontFamily: 'Roboto Mono',
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