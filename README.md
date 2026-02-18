# MDM Social Media Review Portal

Same Firebase project as your Blog Review portal — just a different database path
so the data stays completely separate.

## Files
- `social-index.html`     → Dashboard (all posts, filters, stats)
- `social-post-XX.html`   → Individual post review pages (20 posts)
- `social-app.js`         → All logic: Firebase sync, editor, version history, comments
- `social-posts-data.js`  → Post registry (auto-generated, do not edit manually)
- `style.css`             → Shared design system (same as blog portal)

## GitHub Pages Deployment
1. Create a NEW GitHub repo (e.g. `social-review`)
2. Upload ALL files to the repo root
3. Settings → Pages → Source: Deploy from branch → main → / (root)
4. Your URL: `https://thecreatorie.github.io/social-review/social-index.html`

## Configuration
Open `social-app.js` and confirm the CONFIG block at the top matches your
Firebase + EmailJS credentials. The `dbPath` is already set to
`mdm-social-review-2026` which is separate from the blog portal's data.

## How it works

### Dashboard (`social-index.html`)
- All 20 scheduled posts listed with platform badge, date, caption preview
- Filter by status (Pending / Approved / Changes / Rejected) AND by platform
- Progress bar + live stats
- Export summary to .txt

### Post Pages (`social-post-XX.html`)
**Left column — Live Preview:**
- Phone-frame Instagram/Facebook mockup
- Updates in real time as you type in any field
- Shows caption, location, hashtags, tags, media badge (carousel/reel)

**Right column — Post Details (editable):**
- Post Type: Single Photo / Carousel / Reel / Video
- Platform: Instagram / Facebook / Both
- Media Upload: drag-and-drop or click to upload photos/video
- Alt text for accessibility
- Caption (with 2,200 char counter)
- Location tag
- User/account tags (@handles, comma separated)
- Hashtags (with 30-tag counter)
- Post Date, Post Time, Time Zone

**Bottom — Review & Collaboration:**
- Discussion: public notes visible to everyone, stored in Firebase
- Version History: every saved edit creates a timestamped snapshot
  you can preview and restore at any time
- FAB bar: ✓ Approve / ⚠ Changes / ✕ Reject / ✎ Note
  (all decisions auto-post a discussion note and trigger email notification)

## Adding New Posts
Edit `gen_social_posts.py`, add an entry to the `POSTS` list, and run:
```
python3 gen_social_posts.py
```
Then re-upload the new `social-post-XX.html` and updated `social-posts-data.js`.
