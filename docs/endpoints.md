# KornBeat Microservices API Endpoints

## Overview
Complete documentation of all REST API endpoints across the KornBeat microservices architecture, including authentication, music management, playlist operations, and recommendation services.

---

## 🎵 Music Service (Port 3002)
Base URL: `http://localhost:3002/api/music`

### Songs Management
| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| GET | `/songs` | Get all songs with cover URLs | - |
| GET | `/songs/:id/cover-url` | Get cover URL for specific song | `id` (path) - Song ID |

### Search Endpoints
| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| GET | `/search/artist/:artistName` | Search songs by artist name | `artistName` (path) |
| GET | `/search/song/:songTitle` | Search songs by title | `songTitle` (path) |
| GET | `/search/category/:category` | Search songs by genre/category | `category` (path) |

### Playlist Management
| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| GET | `/user/:userId/playlists` | Get all user playlists | `userId` (path) |
| POST | `/user/:userId/playlists` | Create new playlist | `userId` (path), playlist data in body |
| POST | `/playlists/:playlistId/songs/:songId` | Add song to playlist | `playlistId`, `songId` (path), userId in body |
| DELETE | `/playlists/:playlistId/songs/:songId` | Remove song from playlist | `playlistId`, `songId` (path) |

### User Favorites & History
| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| GET | `/user/:userId/favorites` | Get user's favorite songs | `userId` (path), `page`, `limit`, `sort` (query) |
| GET | `/user/:userId/reel-history` | Get user's playback history | `userId` (path), `limit` (query) |

---

## 🤖 Recommendation Service (Port 3003)
Base URL: `http://localhost:3003/api/recommendations`

### Recommendation Endpoints
| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| GET | `/top-global` | Top 100 global songs | `limit`, `offset` (query) |
| GET | `/top-country/:country` | Top songs by country | `country` (path), `limit`, `offset` (query) |
| GET | `/for-user/:userId` | Personalized recommendations | `userId` (path), `limit` (query) |
| GET | `/by-genres` | Recommendations by genres | `genres[]`, `userId`, `limit` (query) |
| GET | `/similar-artists/:artistId` | Similar artists based on genres | `artistId` (path), `limit` (query) |
| GET | `/collaborative/:userId` | Collaborative filtering recommendations | `userId` (path), `limit` (query) |
| GET | `/discover-emerging/:userId` | Discover emerging artists | `userId` (path), `limit` (query) |
| GET | `/trending` | Trending songs (last 7 days) | `limit`, `country` (query) |
| GET | `/recent-history/:userId` | User's recent listening history | `userId` (path), `limit` (query) |

### Health Check
| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| GET | `/health` | Service health check | - |

---

## 🔐 Auth Service (Port 3001)
Base URL: `http://localhost:3001`

*Note: Auth service endpoints are not fully visible in the provided context, but typically include:*
- POST `/login` - User authentication
- POST `/register` - User registration
- POST `/refresh` - Token refresh
- POST `/logout` - User logout
- GET `/profile` - Get user profile

---

## 📊 Response Formats

### Standard Success Response
```json
{
  "success": true,
  "data": [...],
  "count": 10,
  "total": 100
}
```

### Standard Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

### Song Object Structure
```json
{
  "_id": "string",
  "title": "string",
  "artist": "string",
  "album": "string",
  "duration": "number",
  "genre": "string",
  "coverUrl": "string",
  "fileName": "string",
  "playCount": "number",
  "likes": "number"
}
```

---

## 🔗 Service Dependencies

### Music Service Dependencies
- MongoDB for song metadata
- MinIO for audio file storage
- Redis for caching

### Recommendation Service Dependencies
- Neo4j for graph-based recommendations
- MongoDB for user data
- Redis for caching results

### Auth Service Dependencies
- MongoDB for user data
- Redis for session management

---

## 📝 Usage Examples

### Get Top Global Songs
```bash
curl "http://localhost:3003/api/recommendations/top-global?limit=10"
```

### Search Songs by Artist
```bash
curl "http://localhost:3002/api/music/search/artist/Beatles"
```

### Get User Playlists
```bash
curl "http://localhost:3002/api/music/user/123/playlists"
```

### Get Personalized Recommendations
```bash
curl "http://localhost:3003/api/recommendations/for-user/123?limit=20"
```

## Notes

- All endpoints return JSON responses
- Authentication required for user-specific endpoints (Bearer token)
- Rate limiting may apply to certain endpoints
- Cache TTL varies by endpoint (5 minutes for most recommendations)
- Some recommendation endpoints require user history data to function properly KornBeat:101-717 KornBeat:32-71 KornBeat:695-819 KornBeat:1169-1303 KornBeat:1713-1768 KornBeat:1-81 
