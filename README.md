# 감정 다이어리 - GitHub Pages 배포 가이드

## 배포 방법 (3단계)

### 1단계: GitHub 저장소 만들기
1. [github.com](https://github.com)에 로그인
2. 우측 상단 **+** → **New repository** 클릭
3. Repository name: `emotion-diary` (원하는 이름)
4. **Public** 선택
5. **Create repository** 클릭

### 2단계: 파일 업로드
1. 저장소 페이지에서 **uploading an existing file** 클릭
2. `index.html` 파일을 드래그 앤 드롭
3. **Commit changes** 클릭

### 3단계: GitHub Pages 활성화
1. 저장소 → **Settings** 탭 클릭
2. 좌측 메뉴 → **Pages** 클릭
3. Source → **Deploy from a branch** 선택
4. Branch → **main** / **(root)** 선택
5. **Save** 클릭
6. 1~2분 후 상단에 배포 URL 표시: `https://내아이디.github.io/emotion-diary/`

## 완료!
이 URL을 학생들에게 공유하면 바로 사용할 수 있습니다.

## 참고사항
- **데이터 저장**: localStorage 사용 (각 기기/브라우저별 저장)
- **카메라**: 감정학습장 게임에서 사용 (HTTPS 필수 - GitHub Pages는 자동 HTTPS)
- **무료**: GitHub Pages는 무료 호스팅
- **용량**: HTML 단일 파일 (약 80KB)
