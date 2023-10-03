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
  doodleBullets: new imageLink('/images/doodleBullets.png','https://wansou.itch.io/doodle-bullets'),
  droidVisChanger: new imageLink('/images/droidVisChanger.png','https://steamcommunity.com/sharedfiles/filedetails/?id=1970775475'),
  dyingSwitch: new imageLink('/images/dyingSwitch.png','https://wansou.itch.io/dying-switch'),
  forwardAdventure: new imageLink('/images/forwardAdventure.png','https://wansou.itch.io/forward-adventure'),
  idleParticles: new imageLink('/images/idleParticles.png','https://wansou.itch.io/idle-particle-simulator'),
  lootbags: new imageLink('/images/lootbags.png','https://steamcommunity.com/sharedfiles/filedetails/?id=1977502034'),
  match2048: new imageLink('/images/match2048.png','https://wansou.itch.io/match-2048'),
  quickCiv: new imageLink('/images/quickCiv.png','https://wansou.itch.io/quick-civ'),
}

export const miscImages={
  itchBanner: new imageLink('/images/itchBanner.png','https://wansou.itch.io'),
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

export const aboutData=[
  "I've been programming since late 2018, starting with game development and later transitioning onto web development. I've created numerous games using Game Maker Studio 2, which uses the GML language; a fortunate overlap with JavaScript, making web development more accessible for me.",
  "I've always enjoyed learning new things and concepts in game development, pushing the boundaries of creativity and technical problem-solving in this field has seen me tackle a diverse range of projects, from 2D platformers to complex simulations, each teaching me valuable lessons in design, optimization, and user engagement. This hands-on experience has honed my ability to bring concepts to life while ensuring a seamless and enjoyable user experience."
]

export const sectionData=[
  new section(
    [icons.gms2, icons.js], ["white 40%", "gold 70%"],
    "GML & JS", "In web development, I've used my solid JavaScript skills to craft interactive and user-friendly web apps. This blend of game and web work has broadened my skill set and provided me with a unique perspective on merging gaming and web technologies. I'm excited about applying this mix of expertise to future projects and collaborations."),
  
  new section(
    [icons.nodejs], ["lawngreen", "limegreen"],
    "Node.js", "Diving into Node.js backend development was quite a challenge. I decided to venture into creating a multiplayer game, which, on the surface, seemed simpler than it turned out to be. I started with a swift GML game prototype and then connected multiple clients to a Node.js server. This experience served as a valuable introduction to backend development, and it has proven to be a useful foundation as I delved further into web development."),
  
  new section(
    [icons.html,icons.css,icons.react], ["orangered","#b15ba8 21%, royalblue 42%, #2bcbf2 63%, cyan"],
    "HTML, CSS & React","Then, I made the shift to web development, beginning with the basics of HTML and CSS before exploring various frameworks. Among them, React caught my attention because I found the concept of components incredibly appealing. The availability of component libraries made the process of creating web applications both smooth and efficient."),
  
  new section(
    [icons.vite,icons.ts],["darkorchid 30%", "royalblue 60%"],
    "Vite & Typescript","Later on, I found Vite, a tool that made setting up projects much faster. While using Vite, I also learned about Typescript. Despite my preference for JavaScript, I started using Typescript because it makes code safer and easier to understand. It's become a valuable part of my development toolkit."),
  
  new section(
    [icons.firebase],["orange", "gold 40%"],
    "Firebase","At that moment, I realized I was getting close to becoming a full-stack developer. So, I decided to use Firebase as a starting point for managing databases and backend development. I took on the challenge of creating a web store app with an admin panel, and to my pleasant surprise, it all went much smoother than I expected."),
  
  new section(
    [icons.express],["white", "gray"],
    "Express","Later on, I decided to explore more Node.js and its applications in building web servers. I took a course that taught me important concepts like middleware and security. As I progressed, I made the choice to transition to Express.js, driven by its user-friendly nature and ease of implementation."),
  
  new section(
    [icons.python,icons.cpp],["gold", "#e6bc5c 35%, #8e7ebe 45%, royalblue 50%"],
    "Python & C++","Before diving into web development, I learned Python and C++. While I haven't used them in my recent projects, it's important to note that I still possess a solid grasp of these languages. Although some time has passed since my last hands-on experience with Python and C++, my proficiency in both languages remains intact. I may not have had the chance to showcase them in recent work, but they are valuable tools that I can readily bring to the table when the need arises.")
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
    new footerIcon(icons.github, "https://github.com/WanTheDev"),
    new footerIcon(icons.x, "https://twitter.com/WanTheDev"),
    new footerIcon(icons.youtube,"https://www.youtube.com/channel/UCYkk_vCc9g36VvVQEF6_NAg"),
    new footerIcon(icons.itch,"https://wanthedev.itch.io"),
    new footerIcon(icons.leetcode,"leetcode.com/WanTheDev")
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