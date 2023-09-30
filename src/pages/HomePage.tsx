import { Box, Flex, SimpleGrid, Space, Stack, Text, Title } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import classes from '../styles/homeStyles.module.css'
import { miscImages, sectionData, showcase, aboutData } from "../data";
import HomeSection from "../components/HomeSection";
import StarryArea from "../components/StarryArea";
import GlowingImage from "../components/GlowingImage";

function Showcase({showHalf, wrap=false}:{showHalf:boolean, wrap?:boolean}) {
  return(
      <Stack h="fit-content">
      <Title style={{textAlign: 'center'}}>Showcase</Title>
      <Flex wrap="wrap" justify="center" align="center" gap="xl" pos="relative">
          {
          new Array(showHalf ? showcase.length/2 : showcase.length).fill(0).map((_, curPic) => {
              return(
              <Box pos="relative" w={wrap ? "40vh" : "40%"} component="a" href={showcase[curPic].link} target="_blank" className={classes.hoverContainer} key={curPic}>
                  <GlowingImage image={showcase[curPic].image} radius="xl"/>
              </Box>
              )
          })
          }
          <StarryArea />
      </Flex>
      </Stack>
  )
}

export default function HomePage() {
    const largeScreen = useMediaQuery('(min-width: 60em)');
    const mediumScreen = useMediaQuery('(min-width: 100em)');
    const smallScreen = useMediaQuery('(max-width: 32em)');
    const curFontSize=smallScreen ? "sm" : "md"
    return(
      <Stack p="xl" gap={largeScreen ? "xl" : "sm" }>
        
        <SimpleGrid cols={largeScreen ? 2 : 1} spacing="xl">
          <Showcase showHalf={(smallScreen || (!mediumScreen && largeScreen)) || false} wrap={(!mediumScreen && largeScreen)}/>
          <Stack h="fit-content">
            <Title>WanSou</Title>
            <Text fz={curFontSize}>{aboutData[0]}</Text>
            <Space />
            <a href={miscImages.itchBanner.link} target="_blank" className={classes.bannerContainer}>
                <GlowingImage image={miscImages.itchBanner.image} radius="xl"/>
            </a>
            <Space />
            <Text fz={curFontSize}>{aboutData[1]}</Text>
          </Stack>
        </SimpleGrid>
        {
          sectionData.map((sectionData, sectionNum) => 
            <HomeSection icons={sectionData.icons} side={sectionNum % 2 == 1} key={sectionNum}>
              <div style={{width: "fit-content", position: "relative"}}>
                <div style={{
                  zIndex: -1,
                      position: "absolute",
                      width: "100%",
                      height: "100%",
                      backgroundImage: `linear-gradient(125deg, ${sectionData.gradientColors[0]}, ${sectionData.gradientColors[1]})`,
                      filter: `blur(${largeScreen ? "1" : "3"}rem)`,
                      opacity: 0.4
                }}></div>
                <Title style={{
                  alignItems: largeScreen ? "left" : "center",
                  backgroundImage: `linear-gradient(125deg, ${sectionData.gradientColors[0]}, ${sectionData.gradientColors[1]})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>{sectionData.title}</Title>
                
              </div>
              <Text fz={curFontSize}>{sectionData.description}</Text>
              
            </HomeSection>
          )
        }
      </Stack>
    )
  }