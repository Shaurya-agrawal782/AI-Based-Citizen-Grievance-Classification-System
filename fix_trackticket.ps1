$f = 'client\src\pages\TrackTicket.jsx'
$c = [System.IO.File]::ReadAllText($f)

$old1 = "import { cardReveal, heroReveal, pageRevealProps } from '../utils/pageMotion';"
$new1 = "import { cardReveal, heroReveal, pageRevealProps } from '../utils/pageMotion';" + "`n" + "import { useLanguage } from '../context/LanguageContext';"

$old2 = 'const [searchParams] = useSearchParams();'
$new2 = 'const [searchParams] = useSearchParams();' + "`n  const { t } = useLanguage();"

$c = $c.Replace($old1, $new1)
$c = $c.Replace($old2, $new2)
[System.IO.File]::WriteAllText($f, $c, [System.Text.UTF8Encoding]::new($false))
Write-Host 'OK'
