// Preset text samples for different languages and domains
export interface LanguagePresets {
  podcast: string;
  education: string;
  instructions: string;
  story: string;
  ads: string;
  news: string;
  promotional: string;
  vlog: string;
  business: string;
  standup: string;
  enthusiastic: string;
  casual: string;
  hesitant: string;
  callcenter: string;
  explainer: string;
}

// Podcast-only presets for languages where we only have one sample
const podcastOnlyLanguages: Record<string, string> = {
  'en-GB': "Welcome to our programme exploring the fascinating world of marine biology. From the depths of the ocean to coastal waters, we'll discover the wonders of underwater life.",
  'en-AU': "G'day and welcome to our show about the amazing world of marine biology. From the deep blue ocean to our beautiful coastlines, we'll explore the incredible underwater world.",
  'en-CA': "Welcome to our podcast about the wonderful world of marine biology. From the depths of the ocean to our coastal waters, we'll explore the amazing underwater ecosystems.",
  'en-IN': "Welcome to our programme on marine biology. We will explore the fascinating world beneath the oceans, from the deepest waters to coastal regions.",
  'hi-IN': 'समुद्री जीव विज्ञान की आकर्षक दुनिया में आपका स्वागत है। गहरे समुद्र से लेकर तटीय क्षेत्रों तक, हम पानी के नीचे की अद्भुत दुनिया के बारे में जानेंगे।',
  'es-ES': 'Bienvenidos a nuestro programa sobre el fascinante mundo de la biología marina. Desde las profundidades del océano hasta las costas, exploraremos las maravillas del mundo submarino.',
  'es-MX': 'Bienvenidos a nuestro podcast sobre el fascinante mundo de la biología marina. Desde las profundidades del mar hasta nuestras costas, exploraremos las maravillas del mundo submarino.',
  'ja-JP': '海洋生物学の魅力的な世界へようこそ。深海から沿岸まで、水中世界の驚異とそこに生息する生き物たちについて探求していきます。',
  'fr-FR': 'Bienvenue dans notre émission sur le monde fascinant de la biologie marine. Des profondeurs océaniques aux côtes, nous explorerons les merveilles du monde sous-marin.',
  'fr-CA': 'Bienvenue à notre émission sur le merveilleux monde de la biologie marine. Des profondeurs de l\'océan jusqu\'aux côtes, nous explorerons les merveilles du monde sous-marin.',
  'pt-BR': 'Bem-vindos ao nosso podcast sobre o fascinante mundo da biologia marinha. Das profundezas do oceano até as costas, vamos explorar as maravilhas do mundo submarino.',
  'pt-PT': 'Bem-vindos ao nosso programa sobre o fascinante mundo da biologia marinha. Desde as profundezas do oceano até às costas, iremos explorar as maravilhas do mundo submarino.',
  'it-IT': 'Benvenuti al nostro programma sul affascinante mondo della biologia marina. Dalle profondità dell\'oceano alle coste, esploreremo le meraviglie del mondo sottomarino.',
  'zh-TW': '歡迎來到我們關於海洋生物學奇妙世界的節目。從深海到海岸,我們將探索水下世界的奇蹟和生活在那裡的神奇生物。',
  'ko-KR': '해양 생물학의 매혹적인 세계에 오신 것을 환영합니다. 깊은 바다에서 해안까지, 우리는 수중 세계의 경이로움과 그곳에 사는 놀라운 생물들을 탐험할 것입니다.',
  'nl-NL': 'Welkom bij ons programma over de fascinerende wereld van de mariene biologie. Van de diepten van de oceaan tot de kustlijnen, we verkennen de wonderen van de onderwaterwereld.',
  'sv-SE': 'Välkommen till vårt program om den fascinerande världen av marinbiologi. Från havets djup till kusterna kommer vi att utforska undervattensvärldens under.',
  'pl-PL': 'Witamy w naszym programie o fascynującym świecie biologii morskiej. Od głębin oceanu po wybrzeża, będziemy odkrywać cuda podwodnego świata.',
  'nb-NO': 'Velkommen til vårt program om den fascinerende verden av marinbiologi. Fra havets dyp til kystene vil vi utforske undervannens underverker.',
  'da-DK': 'Velkommen til vores program om den fascinerende verden af marinbiologi. Fra havets dybder til kysterne vil vi udforske undervandensverdenens vidundere.',
  'fi-FI': 'Tervetuloa ohjelmaammme meribiologian kiehtovasta maailmasta. Valtameren syvyyksistä rannikoille tutkimme vedenalaisen maailman ihmeitä.',
  'ru-RU': 'Добро пожаловать в нашу программу об удивительном мире морской биологии. От глубин океана до побережья мы будем исследовать чудеса подводного мира.',
  'ca-ES': 'Benvinguts al nostre programa sobre el fascinant món de la biologia marina. Des de les profunditats de l\'oceà fins a les costes, explorarem les meravelles del món submarí.',
  'tr-TR': 'Deniz biyolojisinin büyüleyici dünyası hakkındaki programımıza hoş geldiniz. Okyanusun derinliklerinden kıyılara kadar, su altı dünyasının harikalarını keşfedeceğiz.',
  'ar-SA': 'مرحباً بكم في برنامجنا عن عالم الأحياء البحرية الرائع. من أعماق المحيط إلى السواحل، سنستكشف عجائب العالم تحت الماء.',
  'ar-EG': 'أهلاً بكم في برنامجنا عن عالم الأحياء البحرية المثير. من أعماق المحيط إلى الشواطئ، سوف نستكشف عجائب العالم تحت الماء.',
  'th-TH': 'ยินดีต้อนรับสู่รายการของเราเกี่ยวกับโลกอันน่าทึ่งของชีววิทยาทางทะเล จากส่วนลึกของมหาสมุทรไปจนถึงชายฝั่ง เราจะสำรวจความมหัศจรรย์ของโลกใต้น้ำ',
  'he-IL': 'ברוכים הבאים לתוכנית שלנו על העולם המרתק של הביולוגיה הימית. מעומקי האוקיינוס ועד לחופים, נחקור את הפלאים של העולם התת-ימי.',
  'cs-CZ': 'Vítejte v našem pořadu o fascinujícím světě mořské biologie. Od hlubin oceánu až po pobřeží budeme zkoumat zázraky podmořského světa.',
  'hu-HU': 'Üdvözöljük műsorunkban a tengeri biológia lenyűgöző világáról. Az óceán mélyétől a partokig felfedezzük a víz alatti világ csodáit.',
  'uk-UA': 'Ласкаво просимо до нашої програми про захоплюючий світ морської біології. Від глибин океану до узбережжя ми досліджуватимемо дива підводного світу.',
  'cy-GB': 'Croeso i\'n rhaglen am fyd hynod ddiddorol bioleg forol. O ddyfnderoedd y cefnfor i\'r arfordiroedd, byddwn yn archwilio rhyfeddodau\'r byd tanddwr.',
  'vi-VN': 'Chào mừng đến với chương trình của chúng tôi về thế giới hấp dẫn của sinh học biển. Từ độ sâu của đại dương đến bờ biển, chúng ta sẽ khám phá những kỳ quan của thế giới dưới nước.',
  'sl-SI': 'Dobrodošli v našem programu o fascinantnem svetu morske biologije. Od globin oceana do obal bomo raziskovali čudeže podvodnega sveta.',
  'id-ID': 'Selamat datang di program kami tentang dunia biologi laut yang menarik. Dari kedalaman samudra hingga garis pantai, kami akan menjelajahi keajaiban dunia bawah laut.',
  'el-GR': 'Καλώς ήρθατε στο πρόγραμμά μας για τον συναρπαστικό κόσμο της θαλάσσιας βιολογίας. Από τα βάθη του ωκεανού μέχρι τις ακτές, θα εξερευνήσουμε τα θαύματα του υποβρύχιου κόσμου.',
  'sk-SK': 'Vitajte v našom programe o fascinujúcom svete morskej biológie. Od hlbín oceánu až po pobrežia budeme skúmať zázraky podmorského sveta.',
  'hr-HR': 'Dobrodošli u naš program o fascinantnom svijetu morske biologije. Od dubina oceana do obala, istražit ćemo čuda podvodnog svijeta.',
  'ro-RO': 'Bun venit la programul nostru despre lumea fascinantă a biologiei marine. De la adâncurile oceanului până la coaste, vom explora minunile lumii subacvatice.',
  'lt-LT': 'Sveiki atvykę į mūsų programą apie žavų jūrų biologijos pasaulį. Nuo vandenyno gelmių iki krantų tyrinėsime povandeninio pasaulio stebuklus.',
  'bg-BG': 'Добре дошли в нашата програма за fascinating world на морската биология. От дълбините на океана до бреговете ще изследваме чудесата на подводния свят.',
  'lv-LV': 'Laipni lūdzam mūsu programmā par aizraujošo jūras bioloģijas pasauli. No okeāna dziļumiem līdz krastiem mēs izpētīsim zemūdens pasaules brīnumus.',
  'et-EE': 'Tere tulemast meie saatesse põnevast merebioloogia maailmast. Ookeani sügavustest kuni rannikualadeni uurime veealuse maailma imesid.',
  'sr-RS': 'Dobrodošli u naš program o fascinantnom svetu morske biologije. Od dubina okeana do obala, istražićemo čuda podvodnog sveta.',
};

export const domainPresets: Record<string, LanguagePresets> = {
  'en-US': {
    podcast: "Welcome to One Fish, Two Fish, the podcast that aims to make you laugh as you learn about the fascinating world of marine biology. From the depths of the deep blue to the shores of our coastlines, we'll explore the wonders of the underwater world and the creatures that call it home.",
    education: "Welcome to today's online math lesson! In this session, we'll delve into the fascinating world of algebra. We'll start by exploring the basics, from solving simple equations like 2x plus 5 equals 11, to understanding variables and coefficients.",
    instructions: "As you complete the inspection, take clear and comprehensive notes. Use our standardized checklist as a guide, noting any deviations or areas of concern. If possible, take photographs to visually document any hazards or non-compliance issues.",
    story: "[narration] Silas sat on his bed, looking at his open suitcase.\n[narration] He had packed his striped toothbrush, his softest fuzzy socks, and his favorite stuffed bear, Barnaby.\n[sad] Even though his bag was full, Silas's tummy felt a little bit empty.\n[whisper] \"What if I miss my own pillow, Barnaby?\" he whispered.\n[anxious] The thought of sleeping away from home made his heart do a nervous little dance.\n[narration] When they pulled up to Grandma Marni's house, Silas held his dad's hand very tightly.\n[narration] The house looked the same as always, with its yellow door and the windchimes that tinkled in the breeze, but tonight felt different.\n[encouraging] \"You're going to have a grand adventure,\" Dad said, kneeling down to give Silas a giant squeeze.\n[determined] Silas took a deep breath and stepped onto the porch.\n[cheerful] Grandma Marni opened the door with a flourish.\n[excited] \"Welcome to the Sleepover Club!\" she cheered.\n[playful] She didn't just give him a hug; she handed him a \"Grandma Kit.\"\n[curious] Inside was a shiny silver flashlight and a cardboard key painted gold.\n[whisper] \"This key unlocks the Fun Zone,\" Marni whispered with a wink.\n[relieved] Silas felt a tiny bit of the emptiness in his tummy disappear.",
    ads: "Introducing the all-new iPhone, setting the standard for Innovation Redefined. Boasting a sleek design and cutting-edge features, this iPhone redefines the pinnacle of technology.",
    news: "Turning to international news, NASA's recent successful mission to send a rover to explore Mars has captured the world's attention. The rover, named 'Perseverance,' touched down on the Martian surface earlier this week.",
    promotional: "Ladies, it's time for some self-pampering! Treat yourself to a moment of bliss with our exclusive Winter Spa Package. Indulge in a rejuvenating spa day like never before, and let your worries melt away.",
    vlog: "Hey, beautiful people! Welcome back to my channel. Today, we're about to spill all the tea on the latest makeup must-haves. Whether you're a makeup enthusiast or just looking to up your glam game, you're in the right place.",
    business: "Winnebago Industries is a company that manufactures motor homes, travel trailers, and other recreational vehicles. Its stock ticker symbol is WGO and it is traded on the New York Stock Exchange.",
    standup: "Oh boy, here we go. You know, I walked into this improv show, and I thought, 'Hey, this could be fun. Maybe they'll have a surprise for me.' Well, guess what? The surprise was that I got roped into doing standup for you folks.",
    enthusiastic: "Oh my gosh, that's AMAZING news! Congratulations! How are you feeling about it all? Any excitement, nerves, or a mix of both? Tell me everything!",
    casual: "Oh no, I didn't mean to disappoint! How about this: If you want something quirky and fun with lots of laughs, go for Blue Man Group. If you're looking for something awe-inspiring and magical, Cirque du Soleil is your best bet.",
    hesitant: "So, uh, I was thinking—no, I mean, I was wondering if, um, if you might want to go to the, uh, the new Italian restaurant on Friday? I've heard it's really—what's the word—oh, exquisite.",
    callcenter: "Thank you for calling customer support. My name is Sarah, and I'll be happy to assist you today. I understand you're experiencing an issue with your account. Let me pull up your information and see how I can help resolve this for you right away.",
    explainer: "Let me explain how photosynthesis works. Plants use sunlight, water, and carbon dioxide to create energy. The process happens in the chloroplasts, which contain chlorophyll - the green pigment that gives plants their color. When sunlight hits the leaves, it triggers a chemical reaction that converts these ingredients into glucose and oxygen."
  },
  'zh-CN': {
    podcast: "欢迎来到我们关于海洋生物学奇妙世界的节目。从深海到海岸,我们将探索水下世界的奇迹和生活在那里的神奇生物。",
    education: "欢迎来到今天的在线数学课！在本课程中，我们将深入探讨代数的迷人世界。我们将从基础开始，从解决简单的方程式到理解变量和系数。",
    instructions: "在完成检查时，请做清晰全面的记录。使用我们的标准化清单作为指南，注明任何偏差或关注的领域。如果可能，请拍照以视觉方式记录任何危险或不合规问题。",
    story: "一种温柔的忧郁压在她的心头，这是由那个笑声回荡在这片草地的时光的记忆编织而成的。她轻抚着一朵被遗忘的雏菊的娇嫩花瓣，陷入沉思，直到一个温柔的声音打破了沉默。",
    ads: "隆重推出全新iPhone，树立创新重新定义的标准。拥有时尚的设计和尖端功能，这款iPhone重新定义了技术的巅峰。",
    news: "转向国际新闻，NASA最近成功向火星发送探测器的任务引起了全世界的关注。这个名为毅力号的探测器于本周早些时候降落在火星表面。",
    promotional: "女士们，是时候宠爱自己了！用我们独家的冬季水疗套餐给自己一刻的幸福。享受前所未有的焕发活力的水疗日，让您的烦恼烟消云散。",
    vlog: "嘿，美丽的人们！欢迎回到我的频道。今天，我们将分享最新的化妆必备品。无论您是化妆爱好者还是只是想提升您的魅力，您都来对地方了。",
    business: "Winnebago Industries是一家制造房车、旅行拖车和其他休闲车辆的公司。其股票代码为WGO，在纽约证券交易所交易。",
    standup: "哦天哪，又来了。你知道，我走进这个即兴表演，我想，嘿，这可能会很有趣。你猜怎么着？惊喜就是我被拉去给你们做单口相声。",
    enthusiastic: "哦天哪，这真是太棒的消息了！恭喜！你对此感觉如何？兴奋、紧张，还是两者兼有？",
    casual: "哦不，我不是要让你失望！这样如何：如果你想要一些古怪有趣、充满欢笑的东西，那就选蓝人乐队。如果你想要一些令人敬畏和神奇的东西，太阳马戏团是你最好的选择。",
    hesitant: "所以，呃，我在想——不，我的意思是，我在想，嗯，你是否想去，呃，周五去那家新的意大利餐厅？我听说它真的——怎么说呢——哦，精致。",
    callcenter: "感谢您致电客户服务中心。我是李明，很高兴为您服务。我了解到您的账户遇到了一些问题。让我为您查询相关信息，我会立即帮您解决这个问题。",
    explainer: "让我来解释光合作用的工作原理。植物利用阳光、水和二氧化碳来产生能量。这个过程发生在叶绿体中，叶绿体含有叶绿素——这种绿色色素使植物呈现绿色。当阳光照射到叶子上时，它会触发一个化学反应，将这些成分转化为葡萄糖和氧气。"
  },
  'de-DE': {
    podcast: "Willkommen zu unserem Podcast über die faszinierende Welt der Meeresbiologie. Von den Tiefen des Ozeans bis zu den Küsten werden wir die Wunder der Unterwasserwelt und die erstaunlichen Kreaturen erkunden.",
    education: "Willkommen zur heutigen Online-Mathematikstunde! In dieser Sitzung werden wir in die faszinierende Welt der Algebra eintauchen. Wir beginnen mit den Grundlagen, vom Lösen einfacher Gleichungen bis zum Verständnis von Variablen.",
    instructions: "Machen Sie bei der Durchführung der Inspektion klare und umfassende Notizen. Verwenden Sie unsere standardisierte Checkliste als Leitfaden und notieren Sie Abweichungen oder Problembereiche.",
    story: "Eine sanfte Melancholie lag auf ihrem Herzen, gewebt aus Erinnerungen an eine Zeit, als Lachen durch diese Wiesen hallte. Sie strich über die zarten Blütenblätter eines vergessenen Gänseblümchens.",
    ads: "Wir präsentieren das brandneue iPhone, das den Standard für neu definierte Innovation setzt. Mit elegantem Design und modernsten Funktionen definiert dieses iPhone den Gipfel der Technologie neu.",
    news: "In den internationalen Nachrichten hat die erfolgreiche Mission der NASA, einen Rover zum Mars zu schicken, weltweite Aufmerksamkeit erregt. Der Rover namens Perseverance landete diese Woche auf der Marsoberfläche.",
    promotional: "Meine Damen, es ist Zeit für etwas Selbstverwöhnung! Gönnen Sie sich einen Moment der Glückseligkeit mit unserem exklusiven Winter-Spa-Paket.",
    vlog: "Hallo, ihr Lieben! Willkommen zurück auf meinem Kanal. Heute werden wir über die neuesten Make-up-Must-haves sprechen.",
    business: "Winnebago Industries ist ein Unternehmen, das Wohnmobile, Reiseanhänger und andere Freizeitfahrzeuge herstellt. Das Börsenkürzel lautet WGO und wird an der New Yorker Börse gehandelt.",
    standup: "Oh je, jetzt geht's los. Wissen Sie, ich kam zu dieser Improv-Show und dachte: 'Hey, das könnte lustig werden.' Die Überraschung war, dass ich hier Stand-up für Sie machen muss.",
    enthusiastic: "Oh mein Gott, das sind ja fantastische Neuigkeiten! Herzlichen Glückwunsch! Wie fühlen Sie sich dabei? Aufgeregt, nervös oder beides?",
    casual: "Oh nein, das wollte ich nicht! Wie wäre es damit: Wenn Sie etwas Skurriles mit viel Lachen wollen, nehmen Sie die Blue Man Group. Für etwas Magisches ist Cirque du Soleil die beste Wahl.",
    hesitant: "Also, äh, ich habe gedacht—nein, ich meine, ich habe mich gefragt, ob, ähm, ob Sie vielleicht Freitag in das, äh, neue italienische Restaurant gehen möchten?",
    callcenter: "Vielen Dank für Ihren Anruf beim Kundendienst. Mein Name ist Anna, und ich helfe Ihnen gerne weiter. Ich verstehe, dass Sie ein Problem mit Ihrem Konto haben. Lassen Sie mich Ihre Informationen abrufen und schauen, wie ich Ihnen umgehend helfen kann.",
    explainer: "Lassen Sie mich erklären, wie Photosynthese funktioniert. Pflanzen nutzen Sonnenlicht, Wasser und Kohlendioxid, um Energie zu erzeugen. Der Prozess findet in den Chloroplasten statt, die Chlorophyll enthalten – das grüne Pigment, das Pflanzen ihre Farbe verleiht. Wenn Sonnenlicht auf die Blätter trifft, löst es eine chemische Reaktion aus, die diese Bestandteile in Glukose und Sauerstoff umwandelt."
  },
  'en-GB': {
    podcast: "Welcome to our programme exploring the fascinating world of marine biology. From the depths of the ocean to coastal waters, we'll discover the wonders of underwater life and the remarkable creatures that inhabit these environments.",
    education: "Welcome to today's online maths lesson! In this session, we'll explore the fascinating world of algebra. We'll begin with the fundamentals, from solving simple equations like 2x plus 5 equals 11, to understanding variables and coefficients.",
    instructions: "As you complete the inspection, take clear and comprehensive notes. Use our standardised checklist as a guide, noting any deviations or areas of concern. If possible, take photographs to visually document any hazards or non-compliance issues.",
    story: "A gentle melancholy weighed upon her heart, woven from memories of a time when laughter echoed through these very meadows. She traced the delicate petals of a forgotten daisy, lost in thought until a soft voice broke the silence.",
    ads: "Introducing the all-new iPhone, setting the standard for Innovation Redefined. Boasting a sleek design and cutting-edge features, this iPhone redefines the pinnacle of technology.",
    news: "Turning to international news, NASA's recent successful mission to send a rover to explore Mars has captured the world's attention. The rover, named Perseverance, touched down on the Martian surface earlier this week.",
    promotional: "Ladies, it's time for some self-pampering! Treat yourself to a moment of bliss with our exclusive Winter Spa Package. Indulge in a rejuvenating spa day like never before, and let your worries melt away.",
    vlog: "Hey, lovely people! Welcome back to my channel. Today, we're going to share all the details on the latest makeup must-haves. Whether you're a makeup enthusiast or just looking to up your glam game, you're in the right place.",
    business: "Winnebago Industries is a company that manufactures motor homes, travel trailers, and other recreational vehicles. Its stock ticker symbol is WGO and it is traded on the New York Stock Exchange.",
    standup: "Oh blimey, here we go. You know, I walked into this improv show, and I thought, 'Right, this could be fun. Maybe they'll have a surprise for me.' Well, guess what? The surprise was that I got roped into doing standup for you lot.",
    enthusiastic: "Oh my goodness, that's brilliant news! Congratulations! How are you feeling about it all? Any excitement, nerves, or a mix of both? Tell me everything!",
    casual: "Oh no, I didn't mean to disappoint! How about this: If you want something quirky and fun with lots of laughs, go for Blue Man Group. If you're looking for something awe-inspiring and magical, Cirque du Soleil is your best bet.",
    hesitant: "So, um, I was thinking—no, I mean, I was wondering if, er, if you might want to go to the, um, the new Italian restaurant on Friday? I've heard it's really—what's the word—oh, exquisite.",
    callcenter: "Thank you for calling customer support. My name is Emily, and I'll be pleased to assist you today. I understand you're experiencing an issue with your account. Let me pull up your information and see how I can help resolve this for you straight away.",
    explainer: "Let me explain how photosynthesis works. Plants use sunlight, water, and carbon dioxide to create energy. The process happens in the chloroplasts, which contain chlorophyll - the green pigment that gives plants their colour. When sunlight hits the leaves, it triggers a chemical reaction that converts these ingredients into glucose and oxygen."
  },
  'en-AU': {
    podcast: "G'day and welcome to our show about the amazing world of marine biology. From the deep blue ocean to our beautiful coastlines, we'll explore the incredible underwater world and the fascinating creatures that call it home.",
    education: "Welcome to today's online maths lesson! In this session, we'll dive into the fascinating world of algebra. We'll start with the basics, from solving simple equations like 2x plus 5 equals 11, to understanding variables and coefficients.",
    instructions: "As you complete the inspection, take clear and comprehensive notes. Use our standardised checklist as a guide, noting any deviations or areas of concern. If possible, take photographs to visually document any hazards or non-compliance issues.",
    story: "A gentle melancholy weighed on her heart, woven from memories of a time when laughter echoed through these very meadows. She traced the delicate petals of a forgotten daisy, lost in thought until a soft voice broke the silence.",
    ads: "Introducing the all-new iPhone, setting the standard for Innovation Redefined. Boasting a sleek design and cutting-edge features, this iPhone redefines the pinnacle of technology.",
    news: "Turning to international news, NASA's recent successful mission to send a rover to explore Mars has captured the world's attention. The rover, named Perseverance, touched down on the Martian surface earlier this week.",
    promotional: "Ladies, it's time for some self-pampering! Treat yourself to a moment of bliss with our exclusive Winter Spa Package. Indulge in a rejuvenating spa day like never before, and let your worries melt away.",
    vlog: "Hey, beautiful people! Welcome back to my channel. Today, we're going to spill all the tea on the latest makeup must-haves. Whether you're a makeup enthusiast or just looking to up your glam game, you're in the right place.",
    business: "Winnebago Industries is a company that manufactures motor homes, travel trailers, and other recreational vehicles. Its stock ticker symbol is WGO and it is traded on the New York Stock Exchange.",
    standup: "Oh crikey, here we go. You know, I rocked up to this improv show, and I thought, 'Yeah, this could be a laugh. Maybe they'll have a surprise for me.' Well, guess what? The surprise was that I got roped into doing standup for you mob.",
    enthusiastic: "Oh my gosh, that's bloody amazing news! Congratulations! How are you feeling about it all? Any excitement, nerves, or a bit of both? Tell me everything!",
    casual: "Oh no, I didn't mean to disappoint! How about this: If you want something quirky and fun with heaps of laughs, go for Blue Man Group. If you're looking for something awe-inspiring and magical, Cirque du Soleil is your best bet.",
    hesitant: "So, um, I was thinking—no, I mean, I was wondering if, er, if you might want to go to the, um, the new Italian restaurant on Friday? I've heard it's really—what's the word—oh, exquisite.",
    callcenter: "Thanks for calling customer support. My name is Jessica, and I'll be happy to help you out today. I understand you're having an issue with your account. Let me pull up your details and see how I can sort this out for you right away.",
    explainer: "Let me explain how photosynthesis works. Plants use sunlight, water, and carbon dioxide to create energy. The process happens in the chloroplasts, which contain chlorophyll - the green pigment that gives plants their colour. When sunlight hits the leaves, it triggers a chemical reaction that converts these ingredients into glucose and oxygen."
  },
  'en-CA': {
    podcast: "Welcome to our podcast about the wonderful world of marine biology. From the depths of the ocean to our coastal waters, we'll explore the amazing underwater ecosystems and the remarkable creatures that inhabit them.",
    education: "Welcome to today's online math lesson! In this session, we'll delve into the fascinating world of algebra. We'll start by exploring the basics, from solving simple equations like 2x plus 5 equals 11, to understanding variables and coefficients.",
    instructions: "As you complete the inspection, take clear and comprehensive notes. Use our standardized checklist as a guide, noting any deviations or areas of concern. If possible, take photographs to visually document any hazards or non-compliance issues.",
    story: "A gentle melancholy weighed on her heart, woven from memories of a time when laughter echoed through these very meadows. She traced the delicate petals of a forgotten daisy, lost in thought until a soft voice broke the silence.",
    ads: "Introducing the all-new iPhone, setting the standard for Innovation Redefined. Boasting a sleek design and cutting-edge features, this iPhone redefines the pinnacle of technology.",
    news: "Turning to international news, NASA's recent successful mission to send a rover to explore Mars has captured the world's attention. The rover, named Perseverance, touched down on the Martian surface earlier this week.",
    promotional: "Ladies, it's time for some self-pampering! Treat yourself to a moment of bliss with our exclusive Winter Spa Package. Indulge in a rejuvenating spa day like never before, and let your worries melt away.",
    vlog: "Hey, beautiful people! Welcome back to my channel. Today, we're about to share all the details on the latest makeup must-haves. Whether you're a makeup enthusiast or just looking to up your glam game, you're in the right place.",
    business: "Winnebago Industries is a company that manufactures motor homes, travel trailers, and other recreational vehicles. Its stock ticker symbol is WGO and it is traded on the New York Stock Exchange.",
    standup: "Oh boy, here we go. You know, eh, I walked into this improv show, and I thought, 'Hey, this could be fun. Maybe they'll have a surprise for me.' Well, guess what? The surprise was that I got roped into doing standup for you folks.",
    enthusiastic: "Oh my gosh, that's amazing news! Congratulations! How are you feeling about it all? Any excitement, nerves, or a mix of both? Tell me everything, eh!",
    casual: "Oh no, I didn't mean to disappoint! How about this: If you want something quirky and fun with lots of laughs, go for Blue Man Group. If you're looking for something awe-inspiring and magical, Cirque du Soleil is your best bet.",
    hesitant: "So, uh, I was thinking—no, I mean, I was wondering if, um, if you might want to go to the, uh, the new Italian restaurant on Friday? I've heard it's really—what's the word—oh, exquisite, eh?",
    callcenter: "Thank you for calling customer support. My name is Laura, and I'll be happy to assist you today. I understand you're experiencing an issue with your account. Let me pull up your information and see how I can help resolve this for you right away.",
    explainer: "Let me explain how photosynthesis works. Plants use sunlight, water, and carbon dioxide to create energy. The process happens in the chloroplasts, which contain chlorophyll - the green pigment that gives plants their colour. When sunlight hits the leaves, it triggers a chemical reaction that converts these ingredients into glucose and oxygen."
  },
  'en-IN': {
    podcast: "Welcome to our programme on marine biology. We will explore the fascinating world beneath the oceans, from the deepest waters to coastal regions, and learn about the wonderful creatures that inhabit these environments.",
    education: "Welcome to today's online mathematics lesson! In this session, we shall delve into the fascinating world of algebra. We will begin with the fundamentals, from solving simple equations like 2x plus 5 equals 11, to understanding variables and coefficients.",
    instructions: "As you complete the inspection, kindly take clear and comprehensive notes. Use our standardised checklist as a guide, noting any deviations or areas of concern. If possible, please take photographs to visually document any hazards or non-compliance issues.",
    story: "A gentle melancholy weighed upon her heart, woven from memories of a time when laughter echoed through these very meadows. She traced the delicate petals of a forgotten daisy, lost in thought until a soft voice broke the silence.",
    ads: "Introducing the all-new iPhone, setting the standard for Innovation Redefined. Boasting a sleek design and cutting-edge features, this iPhone redefines the pinnacle of technology.",
    news: "Turning to international news, NASA's recent successful mission to send a rover to explore Mars has captured the world's attention. The rover, named Perseverance, touched down on the Martian surface earlier this week.",
    promotional: "Ladies, it's time for some self-pampering! Treat yourself to a moment of bliss with our exclusive Winter Spa Package. Indulge in a rejuvenating spa day like never before, and let your worries melt away.",
    vlog: "Hello, beautiful people! Welcome back to my channel. Today, we are going to share all the details on the latest makeup must-haves. Whether you're a makeup enthusiast or just looking to enhance your beauty routine, you're in the right place.",
    business: "Winnebago Industries is a company that manufactures motor homes, travel trailers, and other recreational vehicles. Its stock ticker symbol is WGO and it is traded on the New York Stock Exchange.",
    standup: "Oh my, here we go. You know, I walked into this improv show, and I thought, 'This could be interesting. Perhaps they'll have a surprise for me.' Well, what happened? The surprise was that I got roped into doing standup for you all.",
    enthusiastic: "Oh my goodness, that's wonderful news! Congratulations! How are you feeling about it all? Any excitement, nervousness, or perhaps a combination of both? Please tell me everything!",
    casual: "Oh no, I didn't mean to disappoint! How about this: If you want something quirky and fun with lots of laughter, go for Blue Man Group. If you're looking for something awe-inspiring and magical, Cirque du Soleil would be your best option.",
    hesitant: "So, um, I was thinking—no, I mean, I was wondering if, er, if you might want to go to the, um, the new Italian restaurant on Friday? I've heard it's really—what's the word—ah yes, exquisite.",
    callcenter: "Thank you for calling customer support. My name is Priya, and I shall be pleased to assist you today. I understand you are experiencing an issue with your account. Kindly allow me to access your information and see how I can help resolve this matter for you immediately.",
    explainer: "Let me explain how photosynthesis works. Plants use sunlight, water, and carbon dioxide to create energy. The process happens in the chloroplasts, which contain chlorophyll - the green pigment that gives plants their colour. When sunlight hits the leaves, it triggers a chemical reaction that converts these ingredients into glucose and oxygen."
  },
  'hi-IN': {
    podcast: "समुद्री जीव विज्ञान की आकर्षक दुनिया में आपका स्वागत है। गहरे समुद्र से लेकर तटीय क्षेत्रों तक, हम पानी के नीचे की अद्भुत दुनिया और वहां रहने वाले अद्भुत जीवों के बारे में जानेंगे।",
    education: "आज के ऑनलाइन गणित पाठ में आपका स्वागत है! इस सत्र में, हम बीजगणित की आकर्षक दुनिया में प्रवेश करेंगे। हम बुनियादी बातों से शुरू करेंगे, जैसे 2x प्लस 5 बराबर 11 जैसे सरल समीकरणों को हल करना, चर और गुणांक को समझना।",
    instructions: "निरीक्षण पूरा करते समय, स्पष्ट और व्यापक नोट्स लें। हमारी मानकीकृत चेकलिस्ट को गाइड के रूप में उपयोग करें, किसी भी विचलन या चिंता के क्षेत्रों को नोट करें। यदि संभव हो, तो किसी भी खतरे या गैर-अनुपालन मुद्दों को दृश्य रूप से दस्तावेज करने के लिए फोटो लें।",
    story: "एक कोमल उदासी उसके दिल पर भारी थी, जो उस समय की यादों से बुनी गई थी जब इन्हीं घास के मैदानों में हंसी गूंजती थी। वह एक भूली हुई गुलबहार की नाजुक पंखुड़ियों को सहला रही थी, विचारों में खोई हुई, जब तक कि एक कोमल आवाज ने मौन को तोड़ा।",
    ads: "बिल्कुल नए iPhone की शुरुआत, जो नवाचार को फिर से परिभाषित करने के लिए मानक स्थापित करता है। एक चिकना डिज़ाइन और अत्याधुनिक सुविधाओं के साथ, यह iPhone प्रौद्योगिकी के शिखर को फिर से परिभाषित करता है।",
    news: "अंतर्राष्ट्रीय समाचारों की ओर मुड़ते हुए, नासा के हाल ही में मंगल ग्रह की खोज के लिए एक रोवर भेजने के सफल मिशन ने दुनिया का ध्यान खींचा है। पर्सिवरेंस नामक रोवर इस सप्ताह की शुरुआत में मंगल की सतह पर उतरा।",
    promotional: "महिलाओं, यह अपने आप को लाड़ प्यार करने का समय है! हमारे विशेष विंटर स्पा पैकेज के साथ खुद को आनंद का एक क्षण दें। पहले कभी नहीं की तरह एक पुनर्जीवित करने वाले स्पा दिन का आनंद लें और अपनी चिंताओं को पिघलने दें।",
    vlog: "हे, खूबसूरत लोगो! मेरे चैनल पर वापस स्वागत है। आज, हम नवीनतम मेकअप आवश्यकताओं के बारे में सभी विवरण साझा करने जा रहे हैं। चाहे आप मेकअप के शौकीन हों या बस अपने ग्लैम गेम को बढ़ाना चाहते हों, आप सही जगह पर हैं।",
    business: "Winnebago Industries एक कंपनी है जो मोटर होम, ट्रैवल ट्रेलर और अन्य मनोरंजक वाहनों का निर्माण करती है। इसका स्टॉक टिकर प्रतीक WGO है और यह न्यूयॉर्क स्टॉक एक्सचेंज पर कारोबार किया जाता है।",
    standup: "अरे वाह, यहां हम चलते हैं। आप जानते हैं, मैं इस इम्प्रोव शो में चला गया, और मैंने सोचा, 'अरे, यह मजेदार हो सकता है। शायद उनके पास मेरे लिए एक आश्चर्य होगा।' खैर, अनुमान लगाओ क्या? आश्चर्य यह था कि मुझे आप लोगों के लिए स्टैंडअप करने के लिए रस्सी बांध दी गई।",
    enthusiastic: "अरे वाह, यह शानदार खबर है! बधाई हो! आप इस सब के बारे में कैसा महसूस कर रहे हैं? कोई उत्साह, घबराहट, या दोनों का मिश्रण? मुझे सब कुछ बताओ!",
    casual: "ओह नहीं, मैं निराश नहीं करना चाहता था! यह कैसे रहेगा: यदि आप बहुत सारी हंसी के साथ कुछ विचित्र और मजेदार चाहते हैं, तो ब्लू मैन ग्रुप के लिए जाएं। यदि आप कुछ विस्मयकारी और जादुई तलाश रहे हैं, तो Cirque du Soleil आपकी सबसे अच्छी शर्त है।",
    hesitant: "तो, उम, मैं सोच रहा था—नहीं, मेरा मतलब है, मैं सोच रहा था कि, उम, यदि आप शुक्रवार को, उह, नए इतालवी रेस्तरां में जाना चाहते हैं? मैंने सुना है कि यह वास्तव में—शब्द क्या है—ओह, उत्तम है।",
    callcenter: "ग्राहक सहायता केंद्र में कॉल करने के लिए धन्यवाद। मेरा नाम अनिता है, और मैं आज आपकी सहायता करने में प्रसन्न हूं। मैं समझती हूं कि आपके खाते में कोई समस्या हो रही है। कृपया मुझे आपकी जानकारी देखने दें और मैं तुरंत इसे हल करने में आपकी मदद करूंगी।",
    explainer: "मुझे प्रकाश संश्लेषण कैसे काम करता है यह समझाने दें। पौधे ऊर्जा बनाने के लिए सूर्य की रोशनी, पानी और कार्बन डाइऑक्साइड का उपयोग करते हैं। यह प्रक्रिया क्लोरोप्लास्ट में होती है, जिसमें क्लोरोफिल होता है - यह हरा वर्णक पौधों को उनका रंग देता है। जब सूर्य की रोशनी पत्तियों पर पड़ती है, तो यह एक रासायनिक प्रतिक्रिया शुरू करती है जो इन सामग्रियों को ग्लूकोज और ऑक्सीजन में परिवर्तित करती है।"
  },
  'es-ES': {
    podcast: "Bienvenidos a nuestro programa sobre el fascinante mundo de la biología marina. Desde las profundidades del océano hasta las costas, exploraremos las maravillas del mundo submarino y las criaturas asombrosas que lo habitan.",
    education: "¡Bienvenidos a la clase de matemáticas en línea de hoy! En esta sesión, nos adentraremos en el fascinante mundo del álgebra. Empezaremos explorando los fundamentos, desde resolver ecuaciones simples como 2x más 5 igual a 11, hasta comprender variables y coeficientes.",
    instructions: "Al completar la inspección, tome notas claras y completas. Utilice nuestra lista de verificación estandarizada como guía, anotando cualquier desviación o área de preocupación. Si es posible, tome fotografías para documentar visualmente cualquier peligro o problema de incumplimiento.",
    story: "Una suave melancolía pesaba sobre su corazón, tejida de recuerdos de un tiempo cuando las risas resonaban por estos mismos prados. Acarició los delicados pétalos de una margarita olvidada, perdida en sus pensamientos hasta que una voz suave rompió el silencio.",
    ads: "Presentamos el nuevo iPhone, que establece el estándar de Innovación Redefinida. Con un diseño elegante y funciones de vanguardia, este iPhone redefine la cúspide de la tecnología.",
    news: "En las noticias internacionales, la reciente misión exitosa de la NASA para enviar un rover a explorar Marte ha captado la atención del mundo. El rover, llamado Perseverance, aterrizó en la superficie marciana a principios de esta semana.",
    promotional: "Señoras, ¡es hora de mimarse! Regálese un momento de felicidad con nuestro exclusivo Paquete de Spa de Invierno. Disfrute de un día de spa rejuvenecedor como nunca antes y deje que sus preocupaciones se derritan.",
    vlog: "¡Hola, gente hermosa! Bienvenidos de nuevo a mi canal. Hoy, vamos a compartir todos los detalles sobre los últimos imprescindibles de maquillaje. Ya sea que seas un entusiasta del maquillaje o simplemente quieras mejorar tu juego de glamour, estás en el lugar correcto.",
    business: "Winnebago Industries es una empresa que fabrica autocaravanas, remolques de viaje y otros vehículos recreativos. Su símbolo de cotización bursátil es WGO y se cotiza en la Bolsa de Nueva York.",
    standup: "Oh vaya, aquí vamos. Sabéis, entré en este espectáculo de improvisación y pensé: 'Oye, esto podría ser divertido. Quizás tengan una sorpresa para mí.' Pues, ¿adivináis qué? La sorpresa fue que me obligaron a hacer monólogos para vosotros.",
    enthusiastic: "¡Oh Dios mío, esas son noticias increíbles! ¡Enhorabuena! ¿Cómo te sientes al respecto? ¿Emocionado, nervioso, o una mezcla de ambos? ¡Cuéntamelo todo!",
    casual: "¡Oh no, no quise decepcionarte! ¿Qué te parece esto? Si quieres algo peculiar y divertido con muchas risas, ve a ver Blue Man Group. Si buscas algo impresionante y mágico, Cirque du Soleil es tu mejor opción.",
    hesitant: "Entonces, eh, estaba pensando—no, quiero decir, me preguntaba si, um, si tal vez quisieras ir al, eh, el nuevo restaurante italiano el viernes. He oído que es realmente—¿cuál es la palabra?—oh, exquisito.",
    callcenter: "Gracias por llamar al servicio de atención al cliente. Mi nombre es Carmen, y estaré encantada de ayudarle hoy. Entiendo que está experimentando un problema con su cuenta. Permítame consultar su información y ver cómo puedo resolver esto para usted de inmediato.",
    explainer: "Permítanme explicar cómo funciona la fotosíntesis. Las plantas utilizan la luz solar, el agua y el dióxido de carbono para crear energía. El proceso ocurre en los cloroplastos, que contienen clorofila, el pigmento verde que da a las plantas su color. Cuando la luz solar llega a las hojas, desencadena una reacción química que convierte estos ingredientes en glucosa y oxígeno."
  },
  'es-MX': {
    podcast: "Bienvenidos a nuestro podcast sobre el fascinante mundo de la biología marina. Desde las profundidades del mar hasta nuestras costas, exploraremos las maravillas del mundo submarino y las criaturas asombrosas que lo habitan.",
    education: "¡Bienvenidos a la clase de matemáticas en línea de hoy! En esta sesión, nos adentraremos en el fascinante mundo del álgebra. Comenzaremos explorando los fundamentos, desde resolver ecuaciones simples como 2x más 5 igual a 11, hasta comprender variables y coeficientes.",
    instructions: "Al completar la inspección, tome notas claras y completas. Utilice nuestra lista de verificación estandarizada como guía, anotando cualquier desviación o área de preocupación. Si es posible, tome fotografías para documentar visualmente cualquier peligro o problema de incumplimiento.",
    story: "Una suave melancolía pesaba sobre su corazón, tejida de recuerdos de un tiempo cuando las risas resonaban por estos mismos prados. Acarició los delicados pétalos de una margarita olvidada, perdida en sus pensamientos hasta que una voz suave rompió el silencio.",
    ads: "Presentamos el nuevo iPhone, que establece el estándar de Innovación Redefinida. Con un diseño elegante y funciones de vanguardia, este iPhone redefine la cúspide de la tecnología.",
    news: "En las noticias internacionales, la reciente misión exitosa de la NASA para enviar un rover a explorar Marte ha captado la atención del mundo. El rover, llamado Perseverance, aterrizó en la superficie marciana a principios de esta semana.",
    promotional: "Señoras, ¡es hora de consentirse! Regálense un momento de felicidad con nuestro exclusivo Paquete de Spa de Invierno. Disfruten de un día de spa rejuvenecedor como nunca antes y dejen que sus preocupaciones se derritan.",
    vlog: "¡Hola, gente linda! Bienvenidos de nuevo a mi canal. Hoy, vamos a compartir todos los detalles sobre los últimos imprescindibles de maquillaje. Ya sea que sean entusiastas del maquillaje o simplemente quieran mejorar su juego de glamour, están en el lugar correcto.",
    business: "Winnebago Industries es una compañía que fabrica casas rodantes, tráileres de viaje y otros vehículos recreativos. Su símbolo de cotización bursátil es WGO y se cotiza en la Bolsa de Nueva York.",
    standup: "Ay güey, aquí vamos. Saben, entré a este show de improvisación y pensé: 'Órale, esto podría ser divertido. A lo mejor tienen una sorpresa para mí.' Pues, ¿adivinen qué? La sorpresa fue que me obligaron a hacer stand-up para ustedes.",
    enthusiastic: "¡Ay, qué padre! ¡Esas son noticias increíbles! ¡Felicidades! ¿Cómo te sientes al respecto? ¿Emocionado, nervioso, o una mezcla de ambos? ¡Cuéntamelo todo!",
    casual: "¡Ay no, no quise decepcionarte! ¿Qué te parece esto? Si quieres algo peculiar y divertido con muchas risas, ve a ver Blue Man Group. Si buscas algo impresionante y mágico, Cirque du Soleil es tu mejor opción.",
    hesitant: "Entonces, eh, estaba pensando—no, o sea, me preguntaba si, este, si tal vez quisieras ir al, eh, el nuevo restaurante italiano el viernes. He oído que es realmente—¿cuál es la palabra?—ah sí, exquisito.",
    callcenter: "Gracias por llamar a servicio al cliente. Mi nombre es María, y con gusto le atenderé el día de hoy. Entiendo que está teniendo un problema con su cuenta. Permítame consultar su información y ver cómo puedo ayudarle a resolver esto de inmediato.",
    explainer: "Permítanme explicar cómo funciona la fotosíntesis. Las plantas utilizan la luz solar, el agua y el dióxido de carbono para crear energía. El proceso ocurre en los cloroplastos, que contienen clorofila, el pigmento verde que da a las plantas su color. Cuando la luz solar llega a las hojas, desencadena una reacción química que convierte estos ingredientes en glucosa y oxígeno."
  },
  'ja-JP': {
    podcast: "海洋生物学の魅力的な世界へようこそ。深海から沿岸まで、水中世界の驚異とそこに生息する驚くべき生き物たちについて探求していきます。",
    education: "本日のオンライン数学レッスンへようこそ！このセッションでは、代数学の魅力的な世界に入り込みます。2x + 5 = 11のような簡単な方程式を解くことから、変数と係数を理解することまで、基礎から始めます。",
    instructions: "検査を完了する際は、明確で包括的なメモを取ってください。標準化されたチェックリストをガイドとして使用し、逸脱や懸念事項を記録してください。可能であれば、危険や不適合の問題を視覚的に記録するために写真を撮影してください。",
    story: "優しい憂鬱が彼女の心に重くのしかかっていた。それは、笑い声がこの草原に響いていた時代の記憶から織りなされていた。彼女は忘れられたデイジーの繊細な花びらをなぞり、柔らかい声が沈黙を破るまで思いにふけっていた。",
    ads: "まったく新しいiPhoneの登場です。イノベーションの再定義の基準を設定します。洗練されたデザインと最先端の機能を誇り、このiPhoneはテクノロジーの頂点を再定義します。",
    news: "国際ニュースに目を向けると、NASAが火星を探査するためにローバーを送る最近の成功したミッションが世界の注目を集めています。パーシビアランスと名付けられたローバーは、今週初めに火星の表面に着陸しました。",
    promotional: "女性の皆様、自分へのご褒美の時間です！当社の特別なウィンタースパパッケージで至福のひとときをお過ごしください。これまでにないような若返りのスパデイをお楽しみいただき、悩みを忘れてください。",
    vlog: "やあ、美しい皆さん！私のチャンネルへようこそ。今日は、最新のメイクアップ必需品についてすべてお話しします。メイクアップ愛好家であろうと、グラマーレベルを上げたいだけであろうと、ここが正しい場所です。",
    business: "Winnebago Industriesは、モーターホーム、トラベルトレーラー、その他のレクリエーション車両を製造する会社です。株式ティッカーシンボルはWGOで、ニューヨーク証券取引所で取引されています。",
    standup: "ああ、始まった。ほら、このインプロショーに入って、「ねえ、これは楽しいかもしれない。多分サプライズがあるだろう」と思ったんだ。で、どうなったと思う？サプライズは、あなた方のためにスタンドアップをやらされることだった。",
    enthusiastic: "わあ、それは素晴らしいニュースです！おめでとうございます！それについてどう感じていますか？興奮していますか、緊張していますか、それとも両方の混合ですか？すべて教えてください！",
    casual: "ああ、がっかりさせるつもりはなかったんだ！こうしよう：風変わりで楽しくて笑いがたくさんあるものが欲しいなら、ブルーマングループに行け。畏敬の念を起こさせる魔法のようなものを探しているなら、シルク・ドゥ・ソレイユがベストだ。",
    hesitant: "えっと、その、考えていたんだ—いや、つまり、もし、えー、もしよかったら金曜日に、その、新しいイタリアンレストランに行きたいかなって。本当に—なんて言うか—ああ、絶品だって聞いたんだ。",
    callcenter: "カスタマーサポートにお電話いただきありがとうございます。私の名前は田中美咲と申します。本日はお客様のサポートをさせていただきます。アカウントに問題が発生しているとのことですね。お客様の情報を確認させていただき、すぐに解決できるようお手伝いさせていただきます。",
    explainer: "光合成がどのように機能するかを説明させてください。植物は太陽光、水、二酸化炭素を使ってエネルギーを作り出します。このプロセスは葉緑体で起こります。葉緑体にはクロロフィルが含まれており、これが植物に緑色を与える色素です。太陽光が葉に当たると、化学反応が引き起こされ、これらの材料がグルコースと酸素に変換されます。"
  },
  'fr-FR': {
    podcast: "Bienvenue dans notre émission sur le monde fascinant de la biologie marine. Des profondeurs océaniques aux côtes, nous explorerons les merveilles du monde sous-marin et les créatures extraordinaires qui l'habitent.",
    education: "Bienvenue au cours de mathématiques en ligne d'aujourd'hui ! Dans cette session, nous plongerons dans le monde fascinant de l'algèbre. Nous commencerons par explorer les bases, de la résolution d'équations simples comme 2x plus 5 égale 11, à la compréhension des variables et des coefficients.",
    instructions: "En effectuant l'inspection, prenez des notes claires et complètes. Utilisez notre liste de contrôle standardisée comme guide, en notant tout écart ou domaine préoccupant. Si possible, prenez des photographies pour documenter visuellement tout danger ou problème de non-conformité.",
    story: "Une douce mélancolie pesait sur son cœur, tissée de souvenirs d'un temps où le rire résonnait dans ces mêmes prairies. Elle caressa les pétales délicats d'une marguerite oubliée, perdue dans ses pensées jusqu'à ce qu'une voix douce rompe le silence.",
    ads: "Présentation du tout nouvel iPhone, établissant la norme de l'Innovation Redéfinie. Arborant un design élégant et des fonctionnalités de pointe, cet iPhone redéfinit le summum de la technologie.",
    news: "En tournant vers les nouvelles internationales, la récente mission réussie de la NASA pour envoyer un rover explorer Mars a capté l'attention du monde. Le rover, nommé Perseverance, s'est posé sur la surface martienne plus tôt cette semaine.",
    promotional: "Mesdames, il est temps de vous faire plaisir ! Offrez-vous un moment de bonheur avec notre forfait spa d'hiver exclusif. Profitez d'une journée spa rajeunissante comme jamais auparavant et laissez vos soucis s'envoler.",
    vlog: "Salut, les gens magnifiques ! Bienvenue sur ma chaîne. Aujourd'hui, nous allons partager tous les détails sur les derniers incontournables du maquillage. Que vous soyez passionné de maquillage ou que vous cherchiez simplement à améliorer votre jeu glamour, vous êtes au bon endroit.",
    business: "Winnebago Industries est une entreprise qui fabrique des camping-cars, des caravanes et d'autres véhicules récréatifs. Son symbole boursier est WGO et elle est cotée à la Bourse de New York.",
    standup: "Oh là là, c'est parti. Vous savez, je suis entré dans ce spectacle d'improvisation, et je me suis dit : 'Hé, ça pourrait être amusant. Peut-être qu'ils auront une surprise pour moi.' Eh bien, devinez quoi ? La surprise, c'est qu'on m'a obligé à faire du stand-up pour vous.",
    enthusiastic: "Oh mon Dieu, c'est une nouvelle incroyable ! Félicitations ! Comment vous sentez-vous à ce sujet ? Excité, nerveux, ou un mélange des deux ? Racontez-moi tout !",
    casual: "Oh non, je ne voulais pas vous décevoir ! Que diriez-vous de ceci : Si vous voulez quelque chose d'original et amusant avec beaucoup de rires, optez pour Blue Man Group. Si vous cherchez quelque chose d'impressionnant et magique, Cirque du Soleil est votre meilleur choix.",
    hesitant: "Alors, euh, je pensais—non, je veux dire, je me demandais si, euh, si vous aimeriez aller au, euh, nouveau restaurant italien vendredi ? J'ai entendu dire que c'est vraiment—quel est le mot—oh, exquis.",
    callcenter: "Merci d'avoir appelé le service client. Je m'appelle Sophie, et je serai ravie de vous aider aujourd'hui. Je comprends que vous rencontrez un problème avec votre compte. Permettez-moi de consulter vos informations et voir comment je peux résoudre cela pour vous immédiatement.",
    explainer: "Permettez-moi d'expliquer comment fonctionne la photosynthèse. Les plantes utilisent la lumière du soleil, l'eau et le dioxyde de carbone pour créer de l'énergie. Le processus se déroule dans les chloroplastes, qui contiennent de la chlorophylle - le pigment vert qui donne leur couleur aux plantes. Lorsque la lumière du soleil frappe les feuilles, elle déclenche une réaction chimique qui convertit ces ingrédients en glucose et en oxygène."
  },
  'fr-CA': {
    podcast: "Bienvenue à notre émission sur le merveilleux monde de la biologie marine. Des profondeurs de l'océan jusqu'aux côtes, nous explorerons les merveilles du monde sous-marin et les créatures remarquables qui l'habitent.",
    education: "Bienvenue au cours de mathématiques en ligne d'aujourd'hui ! Dans cette session, nous plongerons dans le monde fascinant de l'algèbre. Nous commencerons par explorer les bases, de la résolution d'équations simples comme 2x plus 5 égale 11, à la compréhension des variables et des coefficients.",
    instructions: "En effectuant l'inspection, prenez des notes claires et complètes. Utilisez notre liste de contrôle standardisée comme guide, en notant tout écart ou domaine préoccupant. Si possible, prenez des photos pour documenter visuellement tout danger ou problème de non-conformité.",
    story: "Une douce mélancolie pesait sur son cœur, tissée de souvenirs d'un temps où le rire résonnait dans ces mêmes prairies. Elle caressa les pétales délicats d'une marguerite oubliée, perdue dans ses pensées jusqu'à ce qu'une voix douce rompe le silence.",
    ads: "Présentation du tout nouvel iPhone, établissant la norme de l'Innovation Redéfinie. Arborant un design élégant et des fonctionnalités de pointe, cet iPhone redéfinit le summum de la technologie.",
    news: "En tournant vers les nouvelles internationales, la récente mission réussie de la NASA pour envoyer un rover explorer Mars a capté l'attention du monde. Le rover, nommé Perseverance, s'est posé sur la surface martienne plus tôt cette semaine.",
    promotional: "Mesdames, c'est le temps de vous gâter ! Offrez-vous un moment de bonheur avec notre forfait spa d'hiver exclusif. Profitez d'une journée spa rajeunissante comme jamais auparavant et laissez vos soucis s'envoler.",
    vlog: "Salut, les gens magnifiques ! Bienvenue sur ma chaîne. Aujourd'hui, on va partager tous les détails sur les derniers incontournables du maquillage. Que vous soyez passionné de maquillage ou que vous cherchiez simplement à améliorer votre jeu glamour, vous êtes à la bonne place.",
    business: "Winnebago Industries est une entreprise qui fabrique des véhicules récréatifs, des roulottes et d'autres véhicules de loisir. Son symbole boursier est WGO et elle est cotée à la Bourse de New York.",
    standup: "Oh là là, ça commence. Vous savez, je suis entré dans ce spectacle d'improvisation, pis je me suis dit : 'Hé, ça pourrait être le fun. Peut-être qu'ils auront une surprise pour moi.' Ben, devinez quoi ? La surprise, c'est qu'on m'a obligé à faire du stand-up pour vous autres.",
    enthusiastic: "Oh mon Dieu, c'est une nouvelle incroyable ! Félicitations ! Comment tu te sens par rapport à ça ? Excité, nerveux, ou un mélange des deux ? Raconte-moi tout !",
    casual: "Oh non, je voulais pas te décevoir ! Que dirais-tu de ça : Si tu veux quelque chose d'original pis amusant avec ben des rires, va voir Blue Man Group. Si tu cherches quelque chose d'impressionnant pis magique, Cirque du Soleil est ton meilleur choix.",
    hesitant: "Alors, euh, je pensais—non, je veux dire, je me demandais si, euh, si tu aimerais aller au, euh, nouveau restaurant italien vendredi ? J'ai entendu dire que c'est vraiment—quel est le mot—oh, exquis.",
    callcenter: "Merci d'avoir appelé le service à la clientèle. Je m'appelle Isabelle, et je serai heureuse de vous aider aujourd'hui. Je comprends que vous éprouvez un problème avec votre compte. Permettez-moi de consulter vos informations et voir comment je peux régler ça pour vous tout de suite.",
    explainer: "Permettez-moi d'expliquer comment fonctionne la photosynthèse. Les plantes utilisent la lumière du soleil, l'eau et le dioxyde de carbone pour créer de l'énergie. Le processus se déroule dans les chloroplastes, qui contiennent de la chlorophylle - le pigment vert qui donne leur couleur aux plantes. Lorsque la lumière du soleil frappe les feuilles, elle déclenche une réaction chimique qui convertit ces ingrédients en glucose et en oxygène."
  },
  'pt-BR': {
    podcast: "Bem-vindos ao nosso podcast sobre o fascinante mundo da biologia marinha. Das profundezas do oceano até as costas, vamos explorar as maravilhas do mundo submarino e as criaturas incríveis que o habitam.",
    education: "Bem-vindos à aula de matemática online de hoje! Nesta sessão, vamos mergulhar no fascinante mundo da álgebra. Começaremos explorando os fundamentos, desde resolver equações simples como 2x mais 5 igual a 11, até entender variáveis e coeficientes.",
    instructions: "Ao completar a inspeção, faça anotações claras e abrangentes. Use nossa lista de verificação padronizada como guia, anotando quaisquer desvios ou áreas de preocupação. Se possível, tire fotografias para documentar visualmente quaisquer perigos ou problemas de não conformidade.",
    story: "Uma melancolia suave pesava em seu coração, tecida de memórias de um tempo quando risadas ecoavam por estes mesmos prados. Ela acariciou as delicadas pétalas de uma margarida esquecida, perdida em pensamentos até que uma voz suave quebrou o silêncio.",
    ads: "Apresentando o novíssimo iPhone, estabelecendo o padrão para Inovação Redefinida. Com um design elegante e recursos de ponta, este iPhone redefine o ápice da tecnologia.",
    news: "Nas notícias internacionais, a recente missão bem-sucedida da NASA para enviar um rover para explorar Marte capturou a atenção do mundo. O rover, chamado Perseverance, pousou na superfície marciana no início desta semana.",
    promotional: "Senhoras, é hora de se mimarem! Presenteiem-se com um momento de felicidade com nosso exclusivo Pacote de Spa de Inverno. Deliciem-se com um dia de spa rejuvenescedor como nunca antes e deixem suas preocupações derreterem.",
    vlog: "E aí, gente linda! Bem-vindos de volta ao meu canal. Hoje, vamos compartilhar todos os detalhes sobre os últimos itens indispensáveis de maquiagem. Seja você um entusiasta de maquiagem ou apenas procurando melhorar seu jogo de glamour, você está no lugar certo.",
    business: "Winnebago Industries é uma empresa que fabrica trailers, reboques de viagem e outros veículos recreativos. Seu símbolo de ações é WGO e é negociado na Bolsa de Valores de Nova York.",
    standup: "Ah cara, lá vamos nós. Sabe, eu entrei nesse show de improviso e pensei: 'Ei, isso pode ser divertido. Talvez eles tenham uma surpresa para mim.' Bem, adivinha o quê? A surpresa foi que me obrigaram a fazer stand-up para vocês.",
    enthusiastic: "Meu Deus, essa é uma notícia incrível! Parabéns! Como você está se sentindo sobre isso tudo? Empolgado, nervoso, ou uma mistura dos dois? Me conta tudo!",
    casual: "Ah não, não quis decepcionar! Que tal isso: Se você quer algo peculiar e divertido com muitas risadas, vá de Blue Man Group. Se você está procurando algo impressionante e mágico, Cirque du Soleil é sua melhor aposta.",
    hesitant: "Então, é, eu estava pensando—não, quero dizer, eu estava me perguntando se, hum, se você talvez quisesse ir ao, é, o novo restaurante italiano na sexta-feira? Eu ouvi que é realmente—qual é a palavra—ah, requintado.",
    callcenter: "Obrigada por ligar para o suporte ao cliente. Meu nome é Juliana, e terei o prazer de ajudá-lo hoje. Entendo que você está enfrentando um problema com sua conta. Deixe-me consultar suas informações e ver como posso resolver isso para você imediatamente.",
    explainer: "Deixe-me explicar como funciona a fotossíntese. As plantas usam luz solar, água e dióxido de carbono para criar energia. O processo acontece nos cloroplastos, que contêm clorofila - o pigmento verde que dá às plantas sua cor. Quando a luz solar atinge as folhas, ela desencadeia uma reação química que converte esses ingredientes em glicose e oxigênio."
  },
  'pt-PT': {
    podcast: "Bem-vindos ao nosso programa sobre o fascinante mundo da biologia marinha. Desde as profundezas do oceano até às costas, iremos explorar as maravilhas do mundo submarino e as criaturas extraordinárias que o habitam.",
    education: "Bem-vindos à aula de matemática online de hoje! Nesta sessão, vamos mergulhar no fascinante mundo da álgebra. Começaremos por explorar os fundamentos, desde resolver equações simples como 2x mais 5 igual a 11, até compreender variáveis e coeficientes.",
    instructions: "Ao completar a inspeção, faça anotações claras e abrangentes. Use a nossa lista de verificação padronizada como guia, anotando quaisquer desvios ou áreas de preocupação. Se possível, tire fotografias para documentar visualmente quaisquer perigos ou problemas de não conformidade.",
    story: "Uma melancolia suave pesava no seu coração, tecida de memórias de um tempo quando risadas ecoavam por estes mesmos prados. Ela acariciou as delicadas pétalas de uma margarida esquecida, perdida em pensamentos até que uma voz suave quebrou o silêncio.",
    ads: "Apresentamos o novíssimo iPhone, estabelecendo o padrão para Inovação Redefinida. Com um design elegante e funcionalidades de ponta, este iPhone redefine o auge da tecnologia.",
    news: "Nas notícias internacionais, a recente missão bem-sucedida da NASA para enviar um rover para explorar Marte capturou a atenção do mundo. O rover, chamado Perseverance, aterrou na superfície marciana no início desta semana.",
    promotional: "Senhoras, é hora de se mimarem! Presenteiem-se com um momento de felicidade com o nosso exclusivo Pacote de Spa de Inverno. Deliciem-se com um dia de spa rejuvenescedor como nunca antes e deixem as vossas preocupações derreterem.",
    vlog: "Olá, gente linda! Bem-vindos de volta ao meu canal. Hoje, vamos partilhar todos os detalhes sobre os últimos indispensáveis de maquilhagem. Quer sejam entusiastas de maquilhagem ou apenas procurem melhorar o vosso jogo de glamour, estão no sítio certo.",
    business: "Winnebago Industries é uma empresa que fabrica autocaravanas, reboques de viagem e outros veículos recreativos. O seu símbolo de cotação é WGO e é negociado na Bolsa de Valores de Nova Iorque.",
    standup: "Oh céus, cá vamos nós. Sabem, entrei neste espetáculo de improviso e pensei: 'Eh pá, isto pode ser divertido. Talvez tenham uma surpresa para mim.' Bem, adivinhem? A surpresa foi que me obrigaram a fazer stand-up para vocês.",
    enthusiastic: "Meu Deus, essa é uma notícia fantástica! Parabéns! Como se está a sentir em relação a isto tudo? Entusiasmado, nervoso, ou uma mistura dos dois? Conta-me tudo!",
    casual: "Oh não, não quis desiludir! Que tal isto: Se querem algo peculiar e divertido com muitas risadas, vão ao Blue Man Group. Se procuram algo impressionante e mágico, o Cirque du Soleil é a vossa melhor aposta.",
    hesitant: "Então, é, eu estava a pensar—não, quer dizer, estava a perguntar-me se, hum, se talvez quisesses ir ao, é, o novo restaurante italiano na sexta-feira? Ouvi dizer que é realmente—qual é a palavra—ah, requintado.",
    callcenter: "Obrigada por contactar o apoio ao cliente. O meu nome é Sofia, e terei todo o gosto em ajudá-lo hoje. Compreendo que está a ter um problema com a sua conta. Permita-me consultar as suas informações e ver como posso resolver isto para si de imediato.",
    explainer: "Permitam-me explicar como funciona a fotossíntese. As plantas usam luz solar, água e dióxido de carbono para criar energia. O processo acontece nos cloroplastos, que contêm clorofila - o pigmento verde que dá às plantas a sua cor. Quando a luz solar atinge as folhas, desencadeia uma reação química que converte estes ingredientes em glucose e oxigénio."
  },
  'it-IT': {
    podcast: "Benvenuti al nostro programma sul affascinante mondo della biologia marina. Dalle profondità dell'oceano alle coste, esploreremo le meraviglie del mondo sottomarino e le creature straordinarie che lo abitano.",
    education: "Benvenuti alla lezione di matematica online di oggi! In questa sessione, ci immergeremo nel affascinante mondo dell'algebra. Inizieremo esplorando i fondamenti, dalla risoluzione di equazioni semplici come 2x più 5 uguale 11, alla comprensione di variabili e coefficienti.",
    instructions: "Mentre completi l'ispezione, prendi note chiare e complete. Usa la nostra lista di controllo standardizzata come guida, annotando eventuali deviazioni o aree di preoccupazione. Se possibile, scatta fotografie per documentare visivamente eventuali pericoli o problemi di non conformità.",
    story: "Una dolce malinconia pesava sul suo cuore, tessuta da ricordi di un tempo quando le risate risuonavano in questi stessi prati. Accarezzò i delicati petali di una margherita dimenticata, persa nei pensieri finché una voce dolce ruppe il silenzio.",
    ads: "Vi presentiamo il nuovissimo iPhone, che stabilisce lo standard per l'Innovazione Ridefinita. Con un design elegante e funzionalità all'avanguardia, questo iPhone ridefinisce l'apice della tecnologia.",
    news: "Passando alle notizie internazionali, la recente missione di successo della NASA per inviare un rover ad esplorare Marte ha catturato l'attenzione del mondo. Il rover, chiamato Perseverance, è atterrato sulla superficie marziana all'inizio di questa settimana.",
    promotional: "Signore, è ora di coccolarsi! Regalatevi un momento di felicità con il nostro esclusivo Pacchetto Spa Invernale. Concedetevi una giornata termale rigenerante come mai prima d'ora e lasciate che le vostre preoccupazioni si sciolgano.",
    vlog: "Ciao, belle persone! Bentornati sul mio canale. Oggi condivideremo tutti i dettagli sugli ultimi must-have del trucco. Che siate appassionati di trucco o semplicemente vogliate migliorare il vostro gioco glamour, siete nel posto giusto.",
    business: "Winnebago Industries è un'azienda che produce camper, roulotte e altri veicoli ricr eativi. Il suo simbolo azionario è WGO ed è quotata alla Borsa di New York.",
    standup: "Oh cavolo, eccoci qui. Sapete, sono entrato in questo spettacolo di improvvisazione e ho pensato: 'Ehi, questo potrebbe essere divertente. Forse avranno una sorpresa per me.' Beh, indovinate un po'? La sorpresa è stata che mi hanno costretto a fare stand-up per voi.",
    enthusiastic: "Oh mio Dio, questa è una notizia fantastica! Congratulazioni! Come ti senti riguardo a tutto questo? Eccitato, nervoso, o un mix di entrambi? Dimmi tutto!",
    casual: "Oh no, non volevo deluderti! Che ne dici di questo: Se vuoi qualcosa di stravagante e divertente con tante risate, scegli Blue Man Group. Se cerchi qualcosa di impressionante e magico, Cirque du Soleil è la tua scelta migliore.",
    hesitant: "Allora, ehm, stavo pensando—no, voglio dire, mi chiedevo se, ehm, se forse vorresti andare al, ehm, nuovo ristorante italiano venerdì? Ho sentito che è davvero—qual è la parola—oh, squisito.",
    callcenter: "Grazie per aver chiamato l'assistenza clienti. Mi chiamo Francesca, e sarò lieta di aiutarla oggi. Capisco che sta riscontrando un problema con il suo account. Mi permetta di consultare le sue informazioni e vedere come posso risolvere questo per lei immediatamente.",
    explainer: "Permettetemi di spiegare come funziona la fotosintesi. Le piante usano la luce solare, l'acqua e l'anidride carbonica per creare energia. Il processo avviene nei cloroplasti, che contengono la clorofilla - il pigmento verde che dà alle piante il loro colore. Quando la luce solare colpisce le foglie, innesca una reazione chimica che converte questi ingredienti in glucosio e ossigeno."
  },
};

// Get language code from voice name (e.g., "en-US-JennyNeural" -> "en-US" or "de-DE-KatjaNeural" -> "de-DE")
export function getLanguageFromVoice(voiceName: string): string {
  // Match pattern like "en-US", "de-DE", etc. (case insensitive for the locale part)
  const match = voiceName.match(/^([a-z]{2}-[A-Z]{2})/i);
  if (match) {
    // Normalize to lowercase-UPPERCASE format (e.g., "de-DE")
    const parts = match[1].split('-');
    return `${parts[0].toLowerCase()}-${parts[1].toUpperCase()}`;
  }
  return 'en-US';
}

// Get presets for a specific language with fallback
export function getPresetsForLanguage(langCode: string): LanguagePresets {
  // If we have full domain presets for this language, return them
  if (domainPresets[langCode]) {
    return domainPresets[langCode];
  }

  // If we have a podcast-only preset, use it for all domains
  if (podcastOnlyLanguages[langCode]) {
    const podcastText = podcastOnlyLanguages[langCode];
    return {
      podcast: podcastText,
      education: podcastText,
      instructions: podcastText,
      story: podcastText,
      ads: podcastText,
      news: podcastText,
      promotional: podcastText,
      vlog: podcastText,
      business: podcastText,
      standup: podcastText,
      enthusiastic: podcastText,
      casual: podcastText,
      hesitant: podcastText,
      callcenter: podcastText,
      explainer: podcastText,
    };
  }

  // Ultimate fallback to en-US
  return domainPresets['en-US'];
}
