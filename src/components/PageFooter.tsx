import classes from '../styles/footerStyles.module.css'
import {footerData} from '../data'
import {Group, Text, Image, UnstyledButton} from '@mantine/core'
import Shadow from './Shadow'

interface iconType {
    image: string
    link: string
}
interface linkType {
    text: string
    link: string
}

function FooterIcon({footerIcon}:{footerIcon: iconType}) {
    return(
        <UnstyledButton className={classes.footerIcon} onClick={() => {window.open(footerIcon.link)}} >
            <Image src={footerIcon.image}/>
        </UnstyledButton>
    )
}

function TextLink({linkData}:{linkData: linkType}) {
return(
    <>
    <a href={linkData.link} target="_blank" className={classes.link}>
        {linkData.text}
    </a>
    {" " /* this adds a space inbetween the links */}
    </>
)
}

export default function PageFooter() {
    return(
        <div style={{position: "relative"}}>
        <Shadow />
        <Group justify="space-between" p="md" w="100%">
          <div>
            <Text c="text.0">Website made using</Text>
            {footerData.links.map((curLink:linkType, i:number) => <div style={{display: "inline"}} key={i}><TextLink linkData={curLink}/></div>)}
          </div>
          <Group>
            {
              footerData.icons.map((curIcon:iconType, i:number) => <FooterIcon footerIcon={curIcon} key={i}/>)
            }
          </Group>
        </Group>
        </div>
    )
}