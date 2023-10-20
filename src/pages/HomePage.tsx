import classes from './pageStyles/homeStyles.module.css'
import { miscImages, aboutData } from "../data";
import Showcase from '../components/Showcase';
import GlowingImage from "../components/GlowingImage";
import Shadow from "../components/Shadow";

function ItchBanner() {
  return(
    <a href={miscImages.itchBanner.link} target="_blank" className={classes.bannerContainer} aria-hidden>
        <GlowingImage image={miscImages.itchBanner.image} radius="xl" loading="eager"/>
    </a>
  )
}

export default function HomePage() {
    return(
      <>
        <div className={classes.topSection}>
          <Showcase />
          <div className={classes.topTextSection}>
            <div className={classes.textTitle}>WanSou</div>
            <div className={classes.text}><Shadow />{aboutData[0]}</div>
            <ItchBanner />
            <div className={classes.text}><Shadow />{aboutData[1]}</div>
          </div>
        </div>
      </>
    )
  }