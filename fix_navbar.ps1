$file = 'client\src\components\Navbar.jsx'
$lines = [System.IO.File]::ReadAllLines($file)
$out = [System.Collections.Generic.List[string]]::new()

foreach ($line in $lines) {
    $l = $line

    # Imports
    if ($l -eq "import { useAuth } from '../context/AuthContext';") {
        $out.Add($l)
        $out.Add("import { useLanguage } from '../context/LanguageContext';")
        $out.Add("import LanguageSwitcher from './common/LanguageSwitcher';")
        continue
    }

    # Hook call
    if ($l -match "^\s+const \{ user, logout, isAdmin \} = useAuth\(\);$") {
        $out.Add($l)
        $out.Add("  const { t } = useLanguage();")
        continue
    }

    # Nav link labels
    $l = $l -replace "label: 'Dashboard'", "label: t('nav.dashboard')"
    $l = $l -replace "label: 'File Grievance'", "label: t('nav.fileGrievance')"
    $l = $l -replace "label: 'Track Complaint'", "label: t('nav.trackComplaint')"
    $l = $l -replace "label: 'Analytics'", "label: t('nav.analytics')"

    # Smart Tools button text
    $l = $l -replace "Smart Tools ", "{t('nav.smartTools')} "

    # Profile/logout
    $l = $l -replace ">Profile Settings<", ">{t('common.profileSettings')}<"
    $l = $l -replace ">Logout<", ">{t('common.logout')}<"
    $l = $l -replace ">Help<", ">{t('common.help')}<"
    $l = $l -replace "title=""Help""", "title={t('common.help')}"
    $l = $l -replace ">Live Support<", ">{t('common.liveSupport')}<"
    $l = $l -replace ">User Guide<", ">{t('common.userGuide')}<"
    $l = $l -replace ">System Feedback<", ">{t('common.systemFeedback')}<"

    # Search placeholder
    $l = $l -replace 'placeholder="Search ID\.\.\."', 'placeholder={t(''common.search'') + '' ID...''}'

    $out.Add($l)

    # Insert LanguageSwitcher after the search bar closing </div>
    if ($l -match '^\s+</div>$' -and $out.Count -gt 5) {
        $prev = $out[$out.Count - 2]
        if ($prev -match 'navbar-search') {
            # Already added - skip
        }
    }
}

# Now inject LanguageSwitcher: find the navbar-search closing </div> and insert after it
$result = [System.Collections.Generic.List[string]]::new()
$injected = $false
for ($i = 0; $i -lt $out.Count; $i++) {
    $result.Add($out[$i])
    if (-not $injected -and $out[$i] -match 'navbar-search' -and $i + 2 -lt $out.Count) {
        # Find the closing </div> after navbar-search
        for ($j = $i + 1; $j -lt [Math]::Min($i + 5, $out.Count); $j++) {
            if ($out[$j] -match '^\s+</div>$') {
                # We'll inject after we process up to j
                break
            }
        }
    }
}

# Simpler: just do string replacement on the joined content
$joined = $out -join "`n"

# Insert LanguageSwitcher after navbar-search block
$searchBlockEnd = '          </div>

          {/* Notifications */}'
$withSwitcher = '          </div>

          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Notifications */}'
$joined = $joined.Replace($searchBlockEnd, $withSwitcher)

[System.IO.File]::WriteAllText($file, $joined, [System.Text.UTF8Encoding]::new($false))
Write-Host "OK - Navbar updated, $($joined.Length) chars"
