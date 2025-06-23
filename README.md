Majd Rezik Personal Website
===========================

This is the source code for my personal website, built to showcase my interests, skills, experiences, and radio interviews.

---

## Project Structure

- `index.html` — Main website content
- `assets/css/style.css` — Main stylesheet
- `assets/js/main.js` — Main JavaScript (carousels, interactivity)
- `assets/img/` — Images (profile, hero, radio interviews, etc.)
- `assets/audio/` — Audio files for radio interviews
- `assets/vendor/` — Third-party libraries (Bootstrap, Swiper, etc.)

---

## Adding Radio Interviews

1. **Add your interview image** to `assets/img/`.
2. **Add your MP3 audio file** to `assets/audio/`.
3. In `index.html`, find the Radio Interviews section and add a new Swiper slide:
   ```html
   <div class="swiper-slide">
     <div class="card h-100 text-center p-3">
       <img src="assets/img/your-image.jpg" ... >
       <h4>Your Interview Title</h4>
       <audio controls>
         <source src="assets/audio/your-audio.mp3" type="audio/mpeg">
         Your browser does not support the audio element.
       </audio>
       <p class="mt-3">Description of the interview.</p>
     </div>
   </div>
   ```
4. Save and reload the site.

---


## Responsive Design

- The site is fully responsive and mobile-friendly.
- Carousels (testimonials, radio interviews) use Swiper.js and are touch-friendly.
- Only one audio can play at a time in the radio interviews section.

---

## CI/CD

- **Deployment and CI/CD are handled via [Netlify](https://www.netlify.com/).**
- Push to the main branch to trigger an automatic build and deployment.

---

## Contact

For questions or collaboration, contact majdrezik@gmail.com or visit www.majdrezik.com
