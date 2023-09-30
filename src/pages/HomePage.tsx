import { Box, Flex, SimpleGrid, Space, Stack, Text, Title } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import classes from '../styles/homeStyles.module.css'
import { miscImages, sectionData, showcase, aboutData } from "../data";
import HomeSection from "../components/HomeSection";
import StarryArea from "../components/StarryArea";
import GlowingImage from "../components/GlowingImage";

/*
function GlowingImage({image}:{image:string}) {
  return(
  <>
      <Image radius="xl" src={image} className={classes.floating} data-blurry pos="absolute" />
      <Image radius="xl" src={image} className={classes.floating} />
  </>
  )
}
function GlowingIcon({image, maxHeight='35vw'}:{image:string, maxHeight: string | number, }) {
  const largeScreen = useMediaQuery('(min-width: 60em)');

  return(
      <Container style={{zIndex: 1, maxWidth: "50vw", maxHeight: maxHeight, aspectRatio: 1}}  pos="relative">
          <Image pos="absolute" src={image} className={classes.floating} data-blurry/>
          <Image pos="absolute" src={image} className={classes.floating}/>
      </Container>
  )
}
*/

function Showcase({showHalf}:{showHalf:boolean}) {
  return(
      <Stack h="fit-content">
      <Title style={{textAlign: 'center'}}>Showcase</Title>
      <Flex wrap="wrap" justify="center" align="center" gap="xl" p="md" pos="relative">
          {
          new Array(showHalf ? showcase.length/2 : showcase.length).fill(0).map((_, curPic) => {
              return(
              <Box pos="relative" w="40%" component="a" href={showcase[curPic].link} target="_blank" className={classes.hoverContainer}  key={curPic}>
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

function About() {
//const {classes} = useStyles()
return(
    <Stack h="fit-content">
    <Title>WanSou</Title>
    <Text>{aboutData[0]}</Text>
    <Space />
    <a href={miscImages.itchBanner.link} target="_blank" className={classes.bannerContainer}>
        <GlowingImage image={miscImages.itchBanner.image} radius="xl"/>
    </a>
    <Space />
    <Text>{aboutData[1]}</Text>
    </Stack>
)
}

export default function HomePage() {
    const largeScreen = useMediaQuery('(min-width: 60em)');
    const smallScreen = useMediaQuery('(max-width: 32em)');

    return(
      <Stack p="xl" gap={largeScreen ? "xl" : "sm" }>
        
        <SimpleGrid cols={largeScreen ? 2 : 1} spacing="xl">
          <Showcase showHalf={smallScreen || false}/>
          <About />
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
              <Text>{sectionData.description}</Text>
              
            </HomeSection>
          )
        }
      </Stack>
    )
  }