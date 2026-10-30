function Header() {
    return (
        // هدر مشترک تمام صفحات
        <header className="site-header" dir="rtl">
            {/* لوگو و مشخصات رستوران */}
            <div className="header-brand">
                <img className="header-logo" src="/images/logo.svg" alt="لوگوی هخامنش" />


                <div className="header-brand-text">
                    <img src="/images/hakhamanesh.svg" alt="هخامنش" className="header-brand-name" />
                    <p>منوی دیجیتال</p>
                </div>
            </div>

            {/* آیکون تماس با رستوران */}
            <a className="header-contact" href="tel:021000000" aria-label="تماس با ما" title="تماس با هخامنش">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 11.19 18a19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.09 3.18 2 2 0 0 1 4.08 1h3a2 2 0 0 1 2 1.72c.12.96.36 1.9.7 2.8a2 2 0 0 1-.45 2.11L8.06 8.9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.84.58 2.8.7A2 2 0 0 1 22 16.92Z" />

                </svg>
            </a>

        </header>
    )
}

export default Header