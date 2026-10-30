import './App.css'
// import BurgerAnimation from './BurgerAnimation'


function HomePage({ onEnterMenu }) {
  return (
    <main className="app">
      <div className="glow-background" aria-hidden="true">
        <span className="glow glow-1"></span>
        <span className="glow glow-2"></span>
        <span className="glow glow-3"></span>
      </div>


      {/* محتوای اصلی صفحه */}
      <section className="hero" dir="rtl">
        {/* محل قرارگیری لوگو در مرحله بعد */}
        <div className="brand-logo">
          <img src={`${import.meta.env.BASE_URL}images/logo.svg`} alt="لوگوی هخامنش" />
        </div>

        <img src={`${import.meta.env.BASE_URL}images/hakhamanesh.svg`} alt="هخامنش" className="brand-title" />
        <p className="description0">
          پیتزا و ساندویچ
        </p>

        {/* تصویر برگر در صفحه شروع */}
        <div className="burger-image">
          <img src={`${import.meta.env.BASE_URL}images/mac-berger.webp`} alt="برگر هخامنش" />
          {/* دکمه مشاهده منو روی تصویر */}
          <button className="menu-button" onClick={onEnterMenu}>
            مشاهده منو
          </button>
        </div>

        

        {/* <p className="eyebrow">طعم متفاوت، تجربه متفاوت</p> */}

        <p className="description">
          طعم اصالت، کیفیت ماندگار
        </p>

        
        
      </section>


    </main>
  )
}

export default HomePage
