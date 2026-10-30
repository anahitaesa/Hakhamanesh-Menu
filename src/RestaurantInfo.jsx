
import { restaurantData } from './restaurantData';
import './RestaurantInfo.css';

function RestaurantInfo() {
  const encodedAddress = encodeURIComponent(
    restaurantData.address
  );

  const mapLinks = [
    {
      name: 'نشان',
      url: `https://neshan.org/maps/search/${encodedAddress}`,
    },
    {
      name: 'بلد',
      url: `https://balad.ir/search/${encodedAddress}`,
    },
    {
      name: 'گوگل مپ',
      url: `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`,
    },
  ];

  return (
    <section className="restaurant-info" dir="rtl">
      <header className="restaurant-info-hero">
        <span className="restaurant-info-label">
          درباره ما
        </span>

        <h1>{restaurantData.name}</h1>

        <p>{restaurantData.description}</p>
      </header>

      <section className="restaurant-info-card">
        <h2>سفارش و پشتیبانی</h2>

        <p>
          برای ثبت سفارش یا دریافت راهنمایی با ما تماس بگیرید.
        </p>

        <a
          className="restaurant-phone-link"
          href={`tel:${restaurantData.phone}`}
        >
          <span>تماس با رستوران</span>
          <strong>{restaurantData.phone}</strong>
        </a>
      </section>

      <section className="restaurant-info-card">
        <h2>ساعات کاری</h2>

        {restaurantData.workingHours.map((hours) => (
          <div
            className="restaurant-hours-row"
            key={hours.title}
          >
            <span>{hours.title}</span>

            <strong>
              {hours.open} تا {hours.close}
            </strong>
          </div>
        ))}
      </section>

      <section className="restaurant-info-card">
        <h2>نشانی رستوران</h2>

        <p className="restaurant-address">
          {restaurantData.address}
        </p>

        <div className="restaurant-map-links">
          {mapLinks.map((map) => (
            <a
              key={map.name}
              href={map.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {map.name}
            </a>
          ))}
        </div>

        <p className="restaurant-map-note">
          برای مسیریابی، نقشه موردنظر خود را انتخاب کنید.
        </p>
      </section>
    </section>
  );
}

export default RestaurantInfo;
