import { Box, Flex, Stack, Text, Title } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import classes from '../styles/homeStyles.module.css'
import { miscImages, sectionData, showcase, aboutData } from "../data";
import HomeSection from "../components/HomeSection";
import StarryArea from "../components/StarryArea";
import GlowingImage from "../components/GlowingImage";
import Shadow from "../components/Shadow";

function Showcase({showHalf, showcaseDir}:{showHalf:boolean, showcaseDir:boolean}) {
  const imageSkewAmount = 25
  return(
      <Stack gap="0">
        <Title c="text.0" ta="center">Showcase</Title>
        <Flex h="100%" wrap="wrap" gap="md" direction={(showcaseDir && showHalf) ? "column" : "row"} justify="space-around" align="center" pos="relative">
            {
            new Array(showHalf ? showcase.length/2 : showcase.length).fill(0).map((_, curPic) => {
                return(
                <Box
                  w={(showcaseDir && showHalf) ? "100%" : "45%"}
                  style={(showHalf) ? {} : {marginTop: `${curPic*imageSkewAmount - (imageSkewAmount*3*(+(curPic>1)) + imageSkewAmount * 0.5)}%`}}
                  
                  className={classes.hoverContainer}
                  key={curPic}

                  component="a"
                  href={showcase[curPic].link}
                  target="_blank">
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

function GradientTitle({title, gradientColors}:{title:string, gradientColors: Array<string>}) {
  return(
    <div className={classes.gradientTitleContainer}>
      <Title
        className={classes.gradientTitle}
        style={{backgroundImage: `linear-gradient(125deg, ${gradientColors[0]}, ${gradientColors[1]})`}}
      >
        {title}
        <div
          className={classes.gradientGlow}
          style={{backgroundImage: `linear-gradient(125deg, ${gradientColors[0]}, ${gradientColors[1]})`}}>
        </div>
      </Title>
    </div>
  )
}

function ItchBanner() {
  return(
    <>
    <a href={miscImages.itchBanner.link} target="_blank" className={classes.bannerContainer}>
        <GlowingImage image={miscImages.itchBanner.image} radius="xl"/>
    </a>
    </>
  )
}

export default function HomePage() {
    //const largeScreen = useMediaQuery('(min-width: 60em)');
    //const mediumScreen = useMediaQuery('(min-width: 100em)');
    //const smallScreen = useMediaQuery('(max-width: 32em)');
    //const curFontSize=smallScreen ? "sm" : "md"
    const showHalf = useMediaQuery('(max-width: 85em)') || false
    const showcaseDir = useMediaQuery('(min-width: 60em)') || false
    return(
      <Stack p="xl" gap={"xl"}>
        
        <Flex gap="xl" pos="relative" direction={showcaseDir ? "row" : "column"}>
          <Showcase showHalf={showHalf} showcaseDir={showcaseDir}/>
          <Stack w={(showcaseDir && showHalf) ? "85%" : showcaseDir ? "140%" : "100%"} gap="sm">
            <Title c="text.0">WanSou</Title>
            <Text c="text.0" className={classes.text}>{aboutData[0]}</Text>
            <ItchBanner />
            <Text c="text.0">{aboutData[1]}</Text>
          </Stack>
          <Shadow />
        </Flex>
        {
          sectionData.map((sectionData, sectionNum) => 
            <HomeSection icons={sectionData.icons} side={sectionNum % 2 == 1} key={sectionNum}>
              <GradientTitle title={sectionData.title} gradientColors={sectionData.gradientColors} />
              <div style={{position: "relative"}}>
                <Shadow />
                <Text c="text.0" >
                  {sectionData.description}
                </Text>
              </div>
            </HomeSection>
          )
        }
      </Stack>
    )
  }