import { Text, Title, Group } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

import classes from './pageStyles/homeStyles.module.css'
import { miscImages, sectionData, aboutData } from "../data";
//import HomeSection from "../components/HomeSection";
import Showcase from '../components/Showcase';
import GlowingImage from "../components/GlowingImage";
import Shadow from "../components/Shadow";
import GradientTitle from "../components/GradientTitle";
import StarryArea from "../components/StarryArea";
import React from "react";

function HomeSection({icons, children, side=true}:{icons: Array<string>, children: Array<JSX.Element>, side?:boolean}) {
  const largeScreen = useMediaQuery('(min-width: 60em)');
  
  const sectionElements = [
      <Group className={classes.sectionImagesGroup} grow>
        {
            icons.map((curIcon:string, curIndex:number) => 
            <div className={classes.sectionImageContainer} key={curIndex}>
                <GlowingImage image={curIcon}/>
                <StarryArea />
            </div>
            )
        }
      </Group>
  ]

  const textSection = 
  <div className={classes.sectionTextContainer} >
      {children.map((c:JSX.Element) => c)}
  </div>

  if (side || largeScreen==false) { sectionElements.push(textSection) }
  else { sectionElements.unshift(textSection) }

  return(
      <div className={classes.sectionWrapper} >
      {
          sectionElements.map((curElement, curIndex) => <React.Fragment key={curIndex}>{curElement}</React.Fragment>)
      }
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
    return(
      <div className={classes.homepageWrapper}>
        
        <div className={classes.topSection}>
          <Showcase />
          <div className={classes.topTextSection} >
            <Title c="text.0">WanSou</Title>
            <Text c="text.0" className={classes.text}>{aboutData[0]}</Text>
            <ItchBanner />
            <Text c="text.0">{aboutData[1]}</Text>
          </div>
          <Shadow />
        </div>
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
      </div>
    )
  }