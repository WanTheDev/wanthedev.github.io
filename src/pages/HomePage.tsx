import { Flex, Stack, Text, Title } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import classes from './pageStyles/homeStyles.module.css'
import { miscImages, sectionData, aboutData } from "../data";
import HomeSection from "../components/HomeSection";
import Showcase from '../components/Showcase';
import GlowingImage from "../components/GlowingImage";
import Shadow from "../components/Shadow";
import GradientTitle from "../components/GradientTitle";

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