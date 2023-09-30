export const icons={
  cpp: '/icons/cpp.svg',
  css: '/icons/css.svg',
  express: '/icons/express.svg',
  firebase: '/icons/firebase.svg',
  github: '/icons/github.svg',
  gms2: '/icons/gms2.svg',
  html: '/icons/html.svg',
  itch: '/icons/itchio.svg',
  js: '/icons/js.svg',
  leetcode: '/icons/leetcode.svg',
  nodejs: '/icons/nodejs.svg',
  python: '/icons/python.svg',
  react: '/icons/react.svg',
  ts: '/icons/ts.svg',
  vite: '/icons/vite.svg',
  x: '/icons/x.svg',
  youtube: '/icons/youtube.svg'
}

export const stars={
  normal: '/icons/star.svg',
  shadow: '/icons/shadowStar.svg'
}

class imageLink {
  image: string
  link: string
  constructor(image:string, link:string) {
    this.image=image
    this.link=link
  }
}
type imageLinkType = InstanceType<typeof imageLink>

export const gameImages={
  buttonsTrail: new imageLink('/images/buttonsTrail.png', 'https://wansou.itch.io/buttons-trail'),
  doodleBullets: new imageLink('/images/doodleBullets.png',''),
  droidVisChanger: new imageLink('/images/droidVisChanger.png',''),
  dyingSwitch: new imageLink('/images/dyingSwitch.png',''),
  forwardAdventure: new imageLink('/images/forwardAdventure.png',''),
  idleParticles: new imageLink('/images/idleParticles.png',''),
  lootbags: new imageLink('/images/lootbags.png',''),
  match2048: new imageLink('/images/match2048.png',''),
  quickCiv: new imageLink('/images/quickCiv.png',''),
}

export const miscImages={
  itchBanner: new imageLink('/images/itchBanner.png',''),
}

export const showcase=[
  gameImages.buttonsTrail,  gameImages.idleParticles,
  gameImages.doodleBullets, gameImages.forwardAdventure
]

class project {
  imageLink: imageLinkType
  name: string
  desc: string

  constructor(name: string, imageLink: imageLinkType, desc: string) {
    this.name=name
    this.imageLink=imageLink
    this.desc=desc
  }
}
//type projectType=InstanceType<typeof project>
export const projectData=[
  new project("Buttons trail", gameImages.buttonsTrail, "Buttons trail description"),
  new project("Doodle bullets", gameImages.doodleBullets, "Doodle bullets description"),
  new project("Droid Vis Changer (forager)", gameImages.droidVisChanger, "Droid visibility changer description"),
  new project("Dying switch", gameImages.dyingSwitch, "Dying switch description"),
  new project("Forward adventure", gameImages.forwardAdventure, "Forward adventure description"),
  new project("Idle particles", gameImages.idleParticles, "Idle particles description"),
  new project("Lootbags (forager)", gameImages.lootbags, "Lootbags description"),
  new project("Match 2048", gameImages.match2048, "Match 2048 description"),
  new project("Quick civ", gameImages.quickCiv, "Quick civ description")
]

class section {
  icons: Array<string>
  gradientColors: Array<string>
  title: string
  description: string

  constructor(icons:Array<string>, gradientColors:Array<string>, title:string, description:string) {
    this.icons=icons 
    this.gradientColors=gradientColors
    this.title=title
    this.description=description
  }
}
//type sectionDataType=InstanceType<typeof section>

export const sectionData=[
  new section(
    [icons.gms2, icons.js], ["white 40%", "gold 70%"],
    "GML & JS", "I've started with GML back in 2018, it was a very forgiving and intuitive language which made it really easy to learn, it was a really nice introduction to a lot of programming concepts which came in hand when learning JS, luckily these 2 languages are really similar so I've mastered them both really quickly."),
  
  new section(
    [icons.nodejs], ["lawngreen", "limegreen"],
    "Node.js", "This was a huge leap in difficulty for me, I've decided to try making a multiplayer game which sounds easier than it actually was, I made a quick prototype of a game in GML and then connected multiple clients to a Node.js server, it was a nice introduction to backend development which came in handy later on when I got into web development."),
  
  new section(
    [icons.html,icons.css,icons.react], ["orangered","#b15ba8 21%, royalblue 42%, #2bcbf2 63%, cyan"],
    "HTML, CSS & React","Later on I've moved onto web development, starting out with raw HTML & CSS and then learning about frameworks, out of all I've picked React due to the concept of components being really appealing to me, and component libraries making web applications really easy and fast to create."),
  
  new section(
    [icons.vite,icons.ts],["darkorchid 30%", "royalblue 60%"],
    "Vite & Typescript","I learned about Vite which made setting up projects 10x faster, funnily enough Vite is how I learned about Typescript and even though I prefer Javascript, I still use Typescript due to it being type safe and more readable."),
  
  new section(
    [icons.firebase],["orange", "gold 40%"],
    "Firebase","This is when I realised I am really close to being a full stack developer, which is why I tried using firebase as a good starting point for database managment & backend development, I decided to make a store web app with an admin panel, it surprisingly worked and the backend introduction went a lot smoother than I expected."),
  
  new section(
    [icons.express],["white", "gray"],
    "Express","Afterwards I tried learning more about node.js and how could I use it to make my own web server, I went through a whole course which taught me a lot of important topics about middleware and security, later on I decided to switch to express.js due to it being easier to use."),
  
  new section(
    [icons.python,icons.cpp],["gold", "#e6bc5c 35%, #8e7ebe 45%, royalblue 50%"],
    "Python & C++","I didn't mention these languages yet, but I did learn Python and C++ way before web development, but due to not needing these languages for any projects, I haven't used them in a long time, but I still know these languages and can use them effectively.")
]

class footerIcon {
  image: string
  link: string
  constructor(image:string, link:string) {
    this.image = image
    this.link = link
  }
}
class footerLink {
  text: string 
  link: string 
  constructor(text: string, link:string) {
    this.text = text
    this.link = link
  }
}

export const footerData={
  icons: [
    new footerIcon(icons.github, "https://github.com/WanSouu"),
    new footerIcon(icons.x, "https://twitter.com/WanSouWasTaken"),
    new footerIcon(icons.youtube,"https://www.youtube.com/channel/UCYkk_vCc9g36VvVQEF6_NAg"),
    new footerIcon(icons.itch,"https://wansou.itch.io"),
    new footerIcon(icons.leetcode,"https://leetcode.com/WanSouu/")
  ],
  links: [
    new footerLink("Vite", "https://vitejs.dev"),
    new footerLink("React", "https://react.dev"),
    new footerLink("Mantine", "https://mantine.dev"),
    new footerLink("Typescript", "https://www.typescriptlang.org"),
  ]
}

class headerButton {
  name: string
  routeName: string
  constructor(name:string, routeName:string) {
    this.name=name
    this.routeName=routeName
  }
}
export const headerData={
  buttons: [
    new headerButton('About', '/'),
    new headerButton('Contact', '/contact'),
    new headerButton('Projects', '/projects')
  ],
  logo: '/icons/logo.svg'
}