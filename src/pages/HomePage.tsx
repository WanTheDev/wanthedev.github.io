import { Box, Container, Flex, Group, Image, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import classes from '../styles/homeStyles.module.css'
import { miscImages, sectionData, showcase } from "../data";
import React from "react";

function GlowingImage({image}:{image:string}) {
    return(
    <>
        <Image radius="xl" src={image} className={classes.floating} data-blurry pos="absolute" />
        <Image radius="xl" src={image} className={classes.floating} />
    </>
    )
}
function GlowingIcon({image}:{image:string}) {
    const largeScreen = useMediaQuery('(min-width: 60em)');

    return(
        <Container style={{zIndex: 1, maxWidth: "50vw", maxHeight: `${largeScreen ? "35" : "20"}vh`, aspectRatio: 1}} p={0} pos="relative">
            <Image pos="absolute" src={image} className={classes.floating} data-blurry/>
            <Image pos="absolute" src={image} className={classes.floating}/>
        </Container>
    )
}
function Showcase({showHalf}:{showHalf:boolean}) {
//const {classes} = useStyles()
//const [gamePictures, setGamePictures] = useState([])
return(
    <Stack h="fit-content">
    <Title style={{align: 'center'}} >Showcase</Title>
    <Flex wrap="wrap" gap="xl" justify="center" align="center" direction="row" p="md" >
        {
        new Array(showHalf ? showcase.length/2 : showcase.length).fill(0).map((_, curPic) => {
            return(
            <Box pos="relative" w="40%" component="a" href={showcase[curPic].link} target="_blank" className={classes.hoverContainer}  key={curPic}>
                <GlowingImage image={showcase[curPic].image}/>
            </Box>
            )
        })
        }
    </Flex>
    </Stack>
)
}

function About() {
//const {classes} = useStyles()
return(
    <Stack h="fit-content">
    <Title>WanSou</Title>
    <Text>I've been programming since late 2018, starting out with simple games and later on moving into web development, although I still consider myself more of a game developer rather than a web developer.</Text>
    <a href={miscImages.itchBanner.link} target="_blank" className={classes.bannerContainer} >
        <GlowingImage image={miscImages.itchBanner.image}/>
    </a>
    <Text>I've made countless of games using Game Maker Studio 2 which uses the GML language, luckily it's very similar to javascript making web development a lot easier for me to learn.</Text>
    </Stack>
)
}

function HomeSection({icons, children, side=true}:{icons: Array<string>, children: Array<JSX.Element>, side?:boolean}) {
const largeScreen = useMediaQuery('(min-width: 60em)');
//const smallScreen = useMediaQuery('(max-width: 32em)');
//const [pictureSeeds, _setPictureSeeds] = useState(Array(icons.length).fill(0).map(() => Math.round(Math.random()*255)))

const sectionElements = [
    <Group w={largeScreen ? "30%" : "100%"} gap="md" wrap="nowrap" grow>
    {
        icons.map((curIcon:string, curIndex:number) => 
        <Container key={curIndex} pos="relative" mt="xl" mb="xl">
            <GlowingIcon image={curIcon}/>
        </Container>
        )
    }
    </Group>
]
const textSection = 
<Stack w={largeScreen ? "40%" : "100%"}>
    {typeof(children)=="object" ? children.map((c:JSX.Element) => c) : children}
</Stack>

if (side || !largeScreen) { sectionElements.push(textSection) }
else { sectionElements.unshift(textSection) }

return(
    <Flex direction={largeScreen ? "row" : "column"} mt={largeScreen ? "xl" : "0"} gap="xl" align="center" justify="space-evenly">
    {
        sectionElements.map((curElement, curIndex) => <React.Fragment key={curIndex}>{curElement}</React.Fragment>)
    }
    </Flex>
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