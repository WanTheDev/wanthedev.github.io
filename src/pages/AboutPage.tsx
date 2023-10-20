import { useMediaQuery } from "@mantine/hooks";
import { Popover } from "@mantine/core";
import classes from './pageStyles/aboutStyles.module.css'
import { sectionData } from "../data";
import GlowingImage from "../components/GlowingImage";
import Shadow from "../components/Shadow";
import GradientTitle from "../components/GradientTitle";
import StarryArea from "../components/StarryArea";
import React from "react";

function Section({icons, children, side=true, largeScreen}:{icons: Array<string>, children: Array<JSX.Element>, side?:boolean, largeScreen:boolean}) {
  const sectionElements = [
      <div className={classes.sectionImagesGroup}>
        {
            icons.map((curIcon:string, curIndex:number) => 
            <div className={classes.sectionImageContainer} key={curIndex}>
                <GlowingImage image={curIcon}/>
                <StarryArea />
            </div>
            )
        }
      </div>
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

//<Text className={classes.text} c="text.0" dangerouslySetInnerHTML={{__html: sectionData.description as string | TrustedHTML}} />
export default function AboutPage() {
  const largeScreen = useMediaQuery('(min-width: 60em)');
  return(
    <div className={classes.homepageWrapper}>
      <div className={classes.homepageInfo}>
      This page includes all of the different languages & frameworks I've used, it also includes certain projects which you can preview by clicking on any of the underlined text within the sections.
      </div>
      {
        sectionData.map((sectionData, sectionNum) => 
          <Section largeScreen={largeScreen || false} icons={sectionData.icons} side={sectionNum % 2 == 1} key={sectionNum}>
            <GradientTitle title={sectionData.title} gradientColors={sectionData.gradientColors} />
            <div style={{position: "relative"}} className={classes.text}>
              <Shadow />
              {
                typeof sectionData.description.props.children == 'string' ? sectionData.description.props.children :
                sectionData.description.props.children.map((c:JSX.Element | string, i:number) => typeof c!='object' ? <React.Fragment key={i}>{c}</React.Fragment> :
                <Popover key={i} classNames={{dropdown: classes.popover}} middlewares={{flip: true, shift: true, inline: false}}>
                  <Popover.Target>
                    {c}
                  </Popover.Target>
                  <Popover.Dropdown>
                    <div className={classes.popoverTitle}>{c.props["data-title"]}</div>
                    <img loading='lazy' className={classes.popoverSrc} src={c.props["data-src"]} />
                  </Popover.Dropdown>
                </Popover>
                )
              }
            </div>
          </Section>
        )
      }
    </div>
  )
}